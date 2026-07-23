import { checkbox } from '@inquirer/prompts';
import { randomUUID } from 'crypto';
import { createServer } from 'http';

let DEFAULT_OAUTH_CALLBACK_PORT = 45873;

let resolveAdvertisedRedirectUri = (localPort: number) => {
  let override = process.env.OAUTH_CALLBACK_OVERRIDE;
  if (!override) return `http://127.0.0.1:${localPort}/callback`;

  let url: URL;
  try {
    url = new URL(override);
  } catch {
    throw new Error(`OAUTH_CALLBACK_OVERRIDE must be an absolute URL, received: ${override}`);
  }

  if (url.pathname === '' || url.pathname === '/') url.pathname = '/callback';
  return url.toString();
};

export let chooseScopes = async (
  authMethod: any,
  initialScopes: string[]
): Promise<string[]> => {
  let scopeIds = (authMethod.scopes ?? []).map((scope: any) => scope.id);
  if (scopeIds.length === 0) {
    return initialScopes;
  }

  return (await checkbox({
    message: 'Choose OAuth scopes',
    choices: authMethod.scopes.map((scope: any) => ({
      name: `${scope.title} (${scope.id})`,
      value: scope.id,
      checked:
        initialScopes.length > 0
          ? initialScopes.includes(scope.id)
          : (scope.defaultChecked ?? true)
    }))
  })) as string[];
};

export let printBrowserUrl = (url: string) => {
  console.log(`Open this URL in your browser:\n${url}`);
};

export let createOAuthCallbackListener = async () => {
  return new Promise<{
    redirectUri: string;
    state: string;
    wait: () => Promise<{
      code: string;
      state: string;
      callbackParams: Record<string, string>;
    }>;
  }>((resolve, reject) => {
    let expectedState = randomUUID();
    let settled = false;
    let callbackPort = Number(process.env.SLATES_OAUTH_PORT ?? DEFAULT_OAUTH_CALLBACK_PORT);

    let server = createServer((req, res) => {
      try {
        let url = new URL(req.url ?? '/', 'http://127.0.0.1');
        let code = url.searchParams.get('code');
        let state = url.searchParams.get('state');
        let oauthError = url.searchParams.get('error');
        let oauthErrorDescription = url.searchParams.get('error_description');
        let oauthErrorUri = url.searchParams.get('error_uri');

        if (oauthError) {
          let description = oauthErrorDescription ?? 'No error description was provided.';
          let errorMessage = `OAuth callback returned "${oauthError}": ${description}${
            oauthErrorUri ? ` (${oauthErrorUri})` : ''
          }`;

          res.statusCode = 400;
          res.end(errorMessage);
          server.close();
          settled = true;
          waiter.reject(new Error(errorMessage));
          return;
        }

        if (!code || !state) {
          res.statusCode = 400;
          res.end('Missing code or state.');
          server.close();
          settled = true;
          waiter.reject(
            new Error(
              `OAuth callback did not include the required query parameters. Received path: ${url.pathname}${url.search}`
            )
          );
          return;
        }

        res.end('Authentication complete. You can close this window.');
        server.close();
        settled = true;
        waiter.resolve({
          code,
          state,
          callbackParams: Object.fromEntries(url.searchParams.entries())
        });
      } catch (error) {
        server.close();
        settled = true;
        waiter.reject(error);
      }
    });

    let waiter = (() => {
      let resolvePromise!: (value: {
        code: string;
        state: string;
        callbackParams: Record<string, string>;
      }) => void;
      let rejectPromise!: (error: unknown) => void;
      let promise = new Promise<{
        code: string;
        state: string;
        callbackParams: Record<string, string>;
      }>((resolveFn, rejectFn) => {
        resolvePromise = resolveFn;
        rejectPromise = rejectFn;
      });

      return {
        promise,
        resolve: resolvePromise,
        reject: rejectPromise
      };
    })();

    let timeout = setTimeout(
      () => {
        if (settled) return;
        server.close();
        waiter.reject(new Error('Timed out waiting for the OAuth callback.'));
      },
      5 * 60 * 1000
    );

    server.on('close', () => clearTimeout(timeout));
    server.on('error', error => {
      if (settled) return;
      settled = true;

      let errno = error as NodeJS.ErrnoException;
      if (errno.code === 'EADDRINUSE') {
        reject(
          new Error(
            `OAuth callback port ${callbackPort} is already in use. Free that port or set SLATES_OAUTH_PORT to a different fixed port.`
          )
        );
        return;
      }

      reject(error);
    });

    server.listen(callbackPort, '127.0.0.1', () => {
      let address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Could not determine OAuth callback address.'));
        return;
      }

      resolve({
        redirectUri: resolveAdvertisedRedirectUri(address.port),
        state: expectedState,
        wait: () => waiter.promise
      });
    });
  });
};
