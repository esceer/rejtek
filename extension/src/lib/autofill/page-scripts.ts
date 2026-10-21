// Functions injected into web pages with browser.scripting.executeScript. Firefox serialises
// them to source text, so each must be fully self-contained: no imports, no outer references.

export interface FrameProbe {
  readonly hostname: string;
  readonly protocol: string;
  readonly hasLoginForm: boolean;
}

export interface FillCredentials {
  readonly username: string;
  readonly password: string;
}

export interface FillResult {
  readonly username: boolean;
  readonly password: boolean;
}

/** Credential-free check: where is this frame, and does it have a login field? */
export function probeFrame(): FrameProbe {
  return {
    hostname: location.hostname,
    protocol: location.protocol,
    hasLoginForm:
      document.querySelector(
        'input[type="password"], input[autocomplete~="username"], input[type="email"]',
      ) !== null,
  };
}

/**
 * Fills the login form: the first visible password field plus the username field before it,
 * or just the username on a username-first login step. Only visible, editable fields are
 * filled, so invisible "honeypot" forms cannot silently collect credentials.
 */
export function fillLoginForm(credentials: FillCredentials): FillResult {
  const hasLayout = document.documentElement.getBoundingClientRect().width > 0;

  const usable = (input: HTMLInputElement): boolean => {
    if (input.disabled || input.readOnly || input.type === 'hidden') return false;
    if (input.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
    for (let el: Element | null = input; el; el = el.parentElement) {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return false;
      }
    }
    // Real pages: reject zero-size or off-screen fields (skipped where nothing is laid out).
    if (hasLayout) {
      const rect = input.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2 || rect.right < 0 || rect.bottom < 0) return false;
    }
    return true;
  };

  const textual = (input: HTMLInputElement) => ['text', 'email', 'tel', ''].includes(input.type);
  const looksLikeUsername = (input: HTMLInputElement) =>
    /\b(username|email)\b/.test(input.autocomplete) ||
    input.type === 'email' ||
    /user|email|login|account|identifier/i.test(`${input.name} ${input.id}`);

  const setValue = (input: HTMLInputElement, value: string) => {
    input.focus();
    // Use the native setter so framework-controlled inputs (React, Vue…) notice the change.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const inputs = Array.from(document.querySelectorAll('input')).filter(usable);
  const password = inputs.find((input) => input.type === 'password');

  let username: HTMLInputElement | undefined;
  if (password) {
    const scope = password.form;
    const before = inputs.filter(
      (input) =>
        textual(input) &&
        (scope === null || input.form === scope) &&
        Boolean(input.compareDocumentPosition(password) & Node.DOCUMENT_POSITION_FOLLOWING),
    );
    username = before.find(looksLikeUsername) ?? before.at(-1);
  } else {
    username = inputs.find((input) => textual(input) && looksLikeUsername(input));
  }

  if (username && credentials.username) setValue(username, credentials.username);
  if (password) setValue(password, credentials.password);
  return { username: Boolean(username && credentials.username), password: Boolean(password) };
}
