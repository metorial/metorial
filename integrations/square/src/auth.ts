import {
  createApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { SQUARE_API_VERSION, SQUARE_ORIGINS } from './lib/constants';
import { squareApiError } from './lib/errors';

const environmentSchema = z.enum(['production', 'sandbox']);
const authInputSchema = z.object({
  environment: environmentSchema
    .default('production')
    .describe(
      'Square environment for these credentials. Sandbox credentials only work in sandbox.'
    )
});
const authOutputSchema = z.object({
  token: z.string().min(1),
  environment: environmentSchema,
  applicationId: z.string().min(1),
  merchantId: z.string().min(1),
  scopes: z.array(z.string()),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional()
});
type SquareAuth = z.infer<typeof authOutputSchema>;

const authClient = (environment: SquareAuth['environment']) => {
  const client = createAxios({
    baseURL: SQUARE_ORIGINS[environment],
    headers: { 'Square-Version': SQUARE_API_VERSION, 'Content-Type': 'application/json' }
  });
  client.interceptors.response.use(
    response => response,
    error => Promise.reject(squareApiError(error, 'authentication request'))
  );
  return client;
};

const tokenStatusSchema = z.object({
  client_id: z.string().min(1),
  merchant_id: z.string().min(1),
  scopes: z.array(z.string()),
  expires_at: z.string().nullish()
});

const tokenIdentity = async (token: string, environment: SquareAuth['environment']) => {
  const response = await authClient(environment).post('/oauth2/token/status', undefined, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const parsed = tokenStatusSchema.safeParse(response.data);
  if (!parsed.success)
    throw createApiServiceError(
      'Square token status did not include the application, merchant, and permissions.'
    );
  const status = parsed.data;
  let expiresAt: string | undefined;
  if (status.expires_at) {
    const timestamp = Date.parse(status.expires_at);
    if (!Number.isFinite(timestamp))
      throw createApiServiceError('Square returned an invalid token expiration time.');
    expiresAt = new Date(timestamp).toISOString();
  }
  return {
    applicationId: status.client_id,
    merchantId: status.merchant_id,
    scopes: status.scopes,
    expiresAt
  };
};

const getProfile = async (ctx: { output: SquareAuth }) => {
  const response = await authClient(ctx.output.environment).get('/v2/merchants/me', {
    headers: { Authorization: `Bearer ${ctx.output.token}` }
  });
  const parsed = z
    .object({
      merchant: z.object({
        id: z.string().min(1),
        business_name: z.string().optional(),
        country: z.string().optional(),
        language_code: z.string().optional(),
        currency: z.string().optional(),
        status: z.string().optional()
      })
    })
    .safeParse(response.data);
  if (!parsed.success)
    throw createApiServiceError('Square profile response did not include a merchant.');
  const merchant = parsed.data.merchant;
  if (merchant.id !== ctx.output.merchantId)
    throw createApiServiceError('Square token and merchant profile identities do not match.');
  return {
    profile: {
      id: merchant.id,
      name: merchant.business_name,
      country: merchant.country,
      languageCode: merchant.language_code,
      currency: merchant.currency,
      status: merchant.status
    }
  };
};

export const auth = SlateAuth.create()
  .output(authOutputSchema)
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    inputSchema: authInputSchema,
    getDefaultInput: async () => ({ environment: 'production' as const }),
    scopes: [
      {
        title: 'Merchant Profile Read',
        description: 'Read merchant profile information',
        scope: 'MERCHANT_PROFILE_READ'
      },
      {
        title: 'Payments Read',
        description: 'Read payment information',
        scope: 'PAYMENTS_READ'
      },
      {
        title: 'Payments Write',
        description: 'Create and manage payments',
        scope: 'PAYMENTS_WRITE'
      },
      { title: 'Orders Read', description: 'Read order information', scope: 'ORDERS_READ' },
      {
        title: 'Orders Write',
        description: 'Create and manage orders',
        scope: 'ORDERS_WRITE'
      },
      {
        title: 'Customers Read',
        description: 'Read customer profiles',
        scope: 'CUSTOMERS_READ'
      },
      {
        title: 'Customers Write',
        description: 'Create and manage customer profiles',
        scope: 'CUSTOMERS_WRITE'
      },
      { title: 'Items Read', description: 'Read catalog items', scope: 'ITEMS_READ' },
      {
        title: 'Items Write',
        description: 'Create and manage catalog items',
        scope: 'ITEMS_WRITE'
      },
      {
        title: 'Inventory Read',
        description: 'Read inventory counts',
        scope: 'INVENTORY_READ'
      },
      {
        title: 'Inventory Write',
        description: 'Manage inventory counts',
        scope: 'INVENTORY_WRITE'
      },
      { title: 'Invoices Read', description: 'Read invoices', scope: 'INVOICES_READ' },
      {
        title: 'Invoices Write',
        description: 'Create and manage invoices',
        scope: 'INVOICES_WRITE'
      },
      {
        title: 'Appointments Read',
        description: 'Read bookings and appointments',
        scope: 'APPOINTMENTS_READ'
      },
      {
        title: 'Loyalty Read',
        description: 'Read loyalty programs and accounts',
        scope: 'LOYALTY_READ'
      },
      {
        title: 'Subscriptions Read',
        description: 'Read subscriptions',
        scope: 'SUBSCRIPTIONS_READ'
      },
      {
        title: 'Subscriptions Write',
        description: 'Manage subscriptions',
        scope: 'SUBSCRIPTIONS_WRITE'
      },
      {
        title: 'Disputes Read',
        description: 'Read dispute information',
        scope: 'DISPUTES_READ'
      },
      { title: 'Payouts Read', description: 'Read payout information', scope: 'PAYOUTS_READ' },
      {
        title: 'Application Fees',
        description: 'Collect and refund application fees',
        scope: 'PAYMENTS_WRITE_ADDITIONAL_RECIPIENTS'
      }
    ],
    getAuthorizationUrl: async ctx => {
      const params = new URLSearchParams({
        client_id: ctx.clientId,
        scope: ctx.scopes.join(' '),
        state: ctx.state,
        redirect_uri: ctx.redirectUri
      });
      if (ctx.input.environment === 'production') params.set('session', 'false');
      return { url: `${SQUARE_ORIGINS[ctx.input.environment]}/oauth2/authorize?${params}` };
    },
    handleCallback: async ctx => {
      const response = await authClient(ctx.input.environment).post('/oauth2/token', {
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code: ctx.code,
        redirect_uri: ctx.redirectUri,
        grant_type: 'authorization_code'
      });
      const token = normalizeOAuthTokenResponse(response.data, { providerLabel: 'Square' });
      const identity = await tokenIdentity(token.token, ctx.input.environment);
      if (identity.applicationId !== ctx.clientId)
        throw createApiServiceError('Square returned a token for a different application.');
      if (!token.refreshToken)
        throw createApiServiceError('Square OAuth did not return a refresh token.');
      return {
        output: { ...token, ...identity, environment: ctx.input.environment },
        scopes: identity.scopes
      };
    },
    handleTokenRefresh: async (ctx: {
      output: SquareAuth;
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken)
        throw createApiServiceError(
          'Square OAuth refresh requires a refresh token. Reconnect the account.'
        );
      const response = await authClient(ctx.output.environment).post('/oauth2/token', {
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        refresh_token: ctx.output.refreshToken,
        grant_type: 'refresh_token'
      });
      const token = normalizeOAuthTokenResponse(response.data, {
        providerLabel: 'Square',
        previousRefreshToken: ctx.output.refreshToken,
        refreshTokenFallbackMode: 'falsy'
      });
      const identity = await tokenIdentity(token.token, ctx.output.environment);
      if (
        identity.applicationId !== ctx.output.applicationId ||
        identity.merchantId !== ctx.output.merchantId
      ) {
        throw createApiServiceError(
          'Square returned a refreshed token for a different application or merchant.'
        );
      }
      return { output: { ...token, ...identity, environment: ctx.output.environment } };
    },
    getProfile
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_access_token',
    inputSchema: authInputSchema.extend({
      token: z
        .string()
        .min(1)
        .describe(
          'Personal access token from the Square Developer Console for the selected environment.'
        )
    }),
    getOutput: async ctx => {
      const identity = await tokenIdentity(ctx.input.token, ctx.input.environment);
      return {
        output: { token: ctx.input.token, environment: ctx.input.environment, ...identity },
        scopes: identity.scopes
      };
    },
    getProfile
  });
