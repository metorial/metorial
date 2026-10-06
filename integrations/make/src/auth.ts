import { createAxios, normalizeOAuthTokenResponse, SlateAuth } from 'slates';
import { MakeClient, resolveZone } from './lib/client';
import { serviceFailure, tokenValue } from './lib/http';
import { id, invalid, malformed, parse, record, z, zone, zoneInput } from './lib/schemas';

const output = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(),
  zoneUrl: zone.optional(),
  authMode: z.enum(['oauth', 'api_token']).optional(),
  userId: id.optional()
});
type AuthOutput = z.output<typeof output>;
const scopes = [
  'scenarios:read',
  'scenarios:write',
  'scenarios:run',
  'connections:read',
  'connections:write',
  'hooks:read',
  'hooks:write',
  'datastores:read',
  'datastores:write',
  'teams:read',
  'organizations:read',
  'user:read',
  'udts:read'
].map(scope => ({
  scope,
  title: scope,
  description: `Access required by the supported ${scope.split(':')[0]} workflows.`
}));
async function exchange(
  body: Record<string, string>,
  zoneUrl: z.output<typeof zone> | undefined,
  previous?: AuthOutput
) {
  let data: unknown;
  try {
    data = (
      await createAxios({
        timeout: 30000,
        maxRedirects: 0,
        maxContentLength: 1024 * 1024
      }).post<unknown>(
        'https://www.make.com/oauth/v2/token',
        new URLSearchParams(body).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      )
    ).data;
  } catch (error) {
    throw serviceFailure(error);
  }
  const response = parse(record, data);
  tokenValue(response.access_token, 'OAuth access token');
  if (response.refresh_token !== undefined && response.refresh_token !== null)
    tokenValue(response.refresh_token, 'OAuth refresh token');
  if (
    response.token_type !== undefined &&
    (typeof response.token_type !== 'string' || response.token_type.toLowerCase() !== 'bearer')
  )
    throw malformed();
  if (
    typeof response.expires_in !== 'number' ||
    !Number.isSafeInteger(response.expires_in) ||
    response.expires_in <= 0 ||
    response.expires_in > Math.floor((8640000000000000 - Date.now()) / 1000)
  )
    throw malformed();
  const tokens = normalizeOAuthTokenResponse(response, {
    providerLabel: 'Make',
    required: true,
    expiresInType: 'number',
    previousRefreshToken: previous?.refreshToken
  });
  if (!tokens.refreshToken)
    throw invalid(
      'Make did not provide a refresh token. Reconnect using the confidential-client OAuth flow.'
    );
  return { ...previous, ...tokens, authMode: 'oauth' as const, zoneUrl };
}
async function profile(ctx: {
  output: AuthOutput;
  input: { zoneUrl?: string };
  config?: Record<string, unknown>;
}) {
  const regional = resolveZone(ctx.output.zoneUrl, ctx.config?.zoneUrl, ctx.input.zoneUrl);
  const client = new MakeClient({ ...ctx.output, zoneUrl: regional });
  const user = await client.getCurrentUser();
  return {
    profile: {
      id: String(user.id),
      name: user.name ?? undefined,
      email: user.email ?? undefined,
      imageUrl: user.avatar ?? undefined,
      zoneUrl: client.zoneUrl
    }
  };
}
export const auth = SlateAuth.create()
  .output(output)
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    scopes,
    inputSchema: z.object({ zoneUrl: zoneInput }),
    async getAuthorizationUrl(ctx) {
      const requested = ctx.scopes.length ? ctx.scopes : scopes.map(s => s.scope);
      const params = new URLSearchParams({
        client_id: tokenValue(ctx.clientId, 'OAuth client ID'),
        response_type: 'code',
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: requested.join(' ')
      });
      resolveZone(undefined, ctx.config?.zoneUrl, ctx.input.zoneUrl);
      return { url: `https://www.make.com/oauth/v2/authorize?${params}` };
    },
    async handleCallback(ctx) {
      const tokens = await exchange(
        {
          client_id: tokenValue(ctx.clientId, 'OAuth client ID'),
          client_secret: tokenValue(ctx.clientSecret, 'OAuth client secret'),
          grant_type: 'authorization_code',
          code: tokenValue(ctx.code, 'OAuth authorization code'),
          redirect_uri: ctx.redirectUri
        },
        resolveZone(undefined, ctx.config?.zoneUrl, ctx.input.zoneUrl)
      );
      const user = await new MakeClient(tokens).getCurrentUser();
      return { output: { ...tokens, userId: user.id } };
    },
    async handleTokenRefresh(ctx: {
      output: AuthOutput;
      input: { zoneUrl?: string };
      clientId: string;
      clientSecret: string;
      config?: Record<string, unknown>;
    }) {
      const saved = resolveZone(ctx.output.zoneUrl, ctx.config?.zoneUrl, ctx.input.zoneUrl);
      return {
        output: await exchange(
          {
            client_id: tokenValue(ctx.clientId, 'OAuth client ID'),
            client_secret: tokenValue(ctx.clientSecret, 'OAuth client secret'),
            grant_type: 'refresh_token',
            refresh_token: tokenValue(ctx.output.refreshToken, 'OAuth refresh token')
          },
          saved,
          ctx.output
        )
      };
    },
    getProfile: profile
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z
        .string()
        .min(1)
        .describe(
          'Make API token with permissions for the requested workflows, including organizations:read for connected-user validation.'
        ),
      zoneUrl: zoneInput
    }),
    async getOutput(ctx) {
      const tokens = {
        token: tokenValue(ctx.input.token),
        authMode: 'api_token' as const,
        zoneUrl: resolveZone(undefined, ctx.config?.zoneUrl, ctx.input.zoneUrl)
      };
      const user = await new MakeClient(tokens).getCurrentUser();
      return { output: { ...tokens, userId: user.id } };
    },
    getProfile: profile
  });
