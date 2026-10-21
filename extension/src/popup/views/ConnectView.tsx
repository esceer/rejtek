import {
  ApiError,
  parsePairingPayload,
  ServerUnreachableError,
  type PairingPayload,
} from '@rejtek/core';
import { Alert, Button, TextField } from '@rejtek/ui';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { extensionStorage } from '../../lib/storage';
import type { CreateApi } from '../App';
import { PopupShell } from '../PopupShell';

const STEPS = [
  'Open Rejtek in Firefox at home and sign in.',
  'Go to Devices → Pair a phone → “Copy link for the browser extension”.',
  'Paste the link here.',
];

export function ConnectView({
  createApi,
  onConnected,
}: {
  createApi: CreateApi;
  onConnected: () => void;
}) {
  const [link, setLink] = useState('');
  const [payload, setPayload] = useState<PairingPayload | null>(null);
  const [error, setError] = useState<string>();

  const connect = useMutation({
    mutationFn: async (target: PairingPayload) => {
      const { os } = await browser.runtime.getPlatformInfo();
      const paired = await createApi({ baseUrl: target.url }).pair({
        pairingToken: target.token,
        name: `Firefox on ${osName(os)}`,
        kind: 'extension',
      });
      await extensionStorage.setConnection({
        url: target.url,
        username: paired.username,
        deviceId: paired.deviceId,
        deviceToken: paired.deviceToken,
        salt: paired.salt,
        kdf: paired.kdf,
        wrappedVaultKey: paired.wrappedVaultKey,
      });
    },
    onSuccess: onConnected,
  });

  const submit = () => {
    let parsed: PairingPayload;
    try {
      parsed = parsePairingPayload(link);
    } catch {
      setError('That is not a Rejtek pairing link.');
      return;
    }
    setError(undefined);
    setPayload(parsed);
    // Must be called directly from the click: Firefox shows permission prompts for user actions only.
    void browser.permissions
      .request({ origins: [`${new URL(parsed.url).origin}/*`] })
      .then((granted) => {
        if (granted) {
          connect.mutate(parsed);
        } else {
          setError('Rejtek needs permission to talk to your server.');
        }
      });
  };

  const unreachable = connect.error instanceof ServerUnreachableError;

  return (
    <PopupShell>
      <div>
        <h1 className="text-lg font-bold">Connect to your server</h1>
        <ol className="mt-3 flex list-decimal flex-col gap-1.5 pl-5 text-sm text-muted">
          {STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
      <form
        noValidate
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <TextField
          label="Pairing link"
          placeholder="rejtek://pair?p=…"
          autoFocus
          spellCheck={false}
          value={link}
          error={error}
          onChange={(e) => {
            setLink(e.target.value);
          }}
        />
        {connect.isError && (
          <Alert tone="danger">
            {unreachable ? (
              <>
                Firefox cannot reach the server, or does not trust its certificate yet. Open the
                server in a tab, accept the certificate once, then try again.
                {payload?.fingerprint && (
                  <span className="mt-1.5 block font-mono text-xs break-all">
                    Expected fingerprint: {payload.fingerprint}
                  </span>
                )}
              </>
            ) : connect.error instanceof ApiError && connect.error.status === 401 ? (
              'This link expired or was already used. Create a new one on the web page.'
            ) : (
              'Something went wrong. Please try again.'
            )}
          </Alert>
        )}
        {unreachable && payload && (
          <Button
            variant="secondary"
            onClick={() => void browser.tabs.create({ url: payload.url })}
          >
            Open server in a new tab
          </Button>
        )}
        <Button type="submit" disabled={connect.isPending || link.trim() === ''}>
          {connect.isPending ? 'Connecting…' : 'Connect'}
        </Button>
      </form>
    </PopupShell>
  );
}

function osName(os: browser.runtime.PlatformOs): string {
  const names: Partial<Record<browser.runtime.PlatformOs, string>> = {
    mac: 'Mac',
    win: 'Windows',
    linux: 'Linux',
    android: 'Android',
  };
  return names[os] ?? os;
}
