/** The server answered with a non-success status. */
export class ApiError extends Error {
  override name = 'ApiError';

  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`Server responded with ${String(status)}`);
  }
}

/** The server could not be reached (offline, other network, timeout). Expected off the home Wi-Fi. */
export class ServerUnreachableError extends Error {
  override name = 'ServerUnreachableError';

  constructor(options?: ErrorOptions) {
    super('Server not reachable', options);
  }
}
