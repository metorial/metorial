import type { SlateAuthWithOauth } from 'slates';
import { GOOGLE_OAUTH_AUTHORIZATION_URL } from './constants';

type SlateOAuthAdminSetup = NonNullable<
  SlateAuthWithOauth<{}, { token: string }>['adminSetup']
>;

type AdminAuthorizationUrlContext = Pick<
  Parameters<NonNullable<SlateOAuthAdminSetup['getAuthorizationUrl']>>[0],
  'clientId' | 'redirectUri' | 'state'
>;

type AdminCallbackContext = Pick<
  Parameters<NonNullable<SlateOAuthAdminSetup['handleCallback']>>[0],
  'clientId'
>;

export type GoogleWorkspaceAdminSetupOptions = {
  productName: string;
  notes?: string[];
  required?: boolean;
};

let GOOGLE_OAUTH_CLIENT_ID_PATTERN = /^[\w.-]+\.apps\.googleusercontent\.com$/;

// The client ID is interpolated into markdown, so anything that is not a Google client
// ID is replaced by a generic reference rather than echoed.
let describeClientId = (clientId: string) =>
  GOOGLE_OAUTH_CLIENT_ID_PATTERN.test(clientId)
    ? `the OAuth client ID \`${clientId}\``
    : "this app's OAuth client ID";

// The admin only signs in to identify the Workspace; trust is granted in the Admin
// console, so the callback discards the code instead of exchanging it.
export let createGoogleWorkspaceAdminSetup = ({
  productName,
  notes = [],
  required
}: GoogleWorkspaceAdminSetupOptions) => ({
  required: required === true,

  getAuthorizationUrl: async (ctx: AdminAuthorizationUrlContext) => {
    let params = new URLSearchParams({
      client_id: ctx.clientId,
      redirect_uri: ctx.redirectUri,
      response_type: 'code',
      state: ctx.state,
      scope: 'openid email'
    });

    return { url: `${GOOGLE_OAUTH_AUTHORIZATION_URL}?${params.toString()}` };
  },

  handleCallback: async (ctx: AdminCallbackContext) => ({
    instructions: [
      `To let users in your Google Workspace organization connect ${productName}, mark this app as trusted in the Google Admin console:`,
      '',
      '1. Sign in to [admin.google.com](https://admin.google.com) as a super administrator.',
      '2. Go to **Security** → **Access and data control** → **API controls**.',
      '3. Under **App access control**, click **Manage third-party app access**.',
      `4. Click **Configure new app** and search for ${describeClientId(ctx.clientId)}.`,
      '5. Select the app, choose who it applies to, and set its access to **Trusted**.',
      '6. Click **Finish**. Changes can take up to 24 hours to apply, though usually less.',
      ...notes.flatMap(note => ['', note])
    ].join('\n')
  })
});
