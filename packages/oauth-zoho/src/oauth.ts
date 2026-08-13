import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse
} from 'slates';
import { z } from 'zod';
import {
  createZohoRegionSchema,
  getZohoRegionForAccountsOrigin,
  getZohoRegionForCallbackLocation,
  validateZohoSupportedRegions,
  ZOHO_REGION_METADATA,
  type ZohoRegion
} from './regions';

export type ZohoApplicationType = 'multi_dc' | 'regional';

export type ZohoOauthScope = {
  title: string;
  description?: string;
  scope: string;
  defaultChecked?: boolean;
};

export type ZohoOauthInput<Region extends ZohoRegion = ZohoRegion> = {
  applicationType: ZohoApplicationType;
  region?: Region;
};

export type ZohoOauthOutput<Region extends ZohoRegion = ZohoRegion> = {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  applicationType: ZohoApplicationType;
  region: Region;
  accountsUrl: string;
  apiDomain: string;
  [key: string]: unknown;
};

export type ZohoAuthorizationUrlContext<Region extends ZohoRegion = ZohoRegion> = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  state: string;
  input: ZohoOauthInput<Region>;
};

export type ZohoCallbackContext<Region extends ZohoRegion = ZohoRegion> =
  ZohoAuthorizationUrlContext<Region> & {
    code: string;
    callbackParams?: Record<string, string>;
    callbackState: Record<string, unknown>;
  };

export type ZohoTokenRefreshContext<Region extends ZohoRegion = ZohoRegion> = {
  clientId: string;
  clientSecret: string;
  scopes: string[];
  input: ZohoOauthInput<Region>;
  output: ZohoOauthOutput<Region>;
};

export type ZohoOutputHookContext<Region extends ZohoRegion = ZohoRegion> = {
  input: ZohoOauthInput<Region>;
  scopes: string[];
  output: ZohoOauthOutput<Region>;
};

export type ZohoProfileHookContext<Region extends ZohoRegion = ZohoRegion> =
  ZohoOutputHookContext<Region>;

export type ZohoApiOrigins<Regions extends readonly ZohoRegion[]> = {
  [Region in Regions[number]]: readonly `https://${string}`[];
};

type ZohoOauthBaseOptions<Regions extends readonly ZohoRegion[]> = {
  supportedRegions: Regions;
  scopes: ZohoOauthScope[];
  apiOrigins: ZohoApiOrigins<Regions>;
  profile?: (ctx: ZohoProfileHookContext<Regions[number]>) => Promise<Record<string, unknown>>;
  extendOutput?: (
    ctx: ZohoOutputHookContext<Regions[number]>
  ) => Promise<Record<string, unknown> | undefined>;
};

export type ZohoOauthOptions<Regions extends readonly ZohoRegion[]> =
  ZohoOauthBaseOptions<Regions>;

let invalidConfiguration = (message: string) =>
  createApiServiceError(`Invalid Zoho OAuth configuration: ${message}`, {
    reason: 'zoho_oauth_configuration'
  });

let invalidCallback = (message: string) =>
  createApiServiceError(`Invalid Zoho OAuth callback: ${message}`, {
    reason: 'zoho_oauth_callback'
  });

let invalidOutput = (message: string) =>
  createApiServiceError(`Invalid Zoho OAuth state: ${message}`, {
    reason: 'zoho_oauth_state'
  });

let isExactHttpsOrigin = (value: unknown): value is `https://${string}` => {
  if (typeof value !== 'string') return false;

  try {
    let parsed = new URL(value);
    return (
      parsed.protocol === 'https:' &&
      !parsed.username &&
      !parsed.password &&
      !parsed.port &&
      parsed.pathname === '/' &&
      !parsed.search &&
      !parsed.hash &&
      parsed.origin === value
    );
  } catch {
    return false;
  }
};

let validateApiOriginConfiguration = <Regions extends readonly ZohoRegion[]>(
  supportedRegions: Regions,
  apiOrigins: ZohoApiOrigins<Regions>
) => {
  if (!apiOrigins || typeof apiOrigins !== 'object' || Array.isArray(apiOrigins)) {
    throw invalidConfiguration('apiOrigins must define an allowlist for every region.');
  }

  let configuredOrigins = apiOrigins as Partial<
    Record<ZohoRegion, readonly `https://${string}`[]>
  >;
  for (let region of supportedRegions) {
    let allowedOrigins = configuredOrigins[region];
    if (!Array.isArray(allowedOrigins) || allowedOrigins.length === 0) {
      throw invalidConfiguration(`apiOrigins.${region} must contain at least one origin.`);
    }

    let seen = new Set<string>();
    for (let origin of allowedOrigins) {
      if (!isExactHttpsOrigin(origin)) {
        throw invalidConfiguration(
          `apiOrigins.${region} contains a non-canonical HTTPS origin.`
        );
      }
      if (seen.has(origin)) {
        throw invalidConfiguration(`apiOrigins.${region} contains a duplicate origin.`);
      }
      seen.add(origin);
    }
  }
};

type ZohoOauthInputSchema<Regions extends readonly ZohoRegion[]> = z.ZodObject<{
  applicationType: z.ZodEnum<{
    multi_dc: 'multi_dc';
    regional: 'regional';
  }>;
  region: z.ZodOptional<ReturnType<typeof createZohoRegionSchema<Regions>>>;
}>;

let resolveInput = <Regions extends readonly ZohoRegion[]>(
  inputSchema: ZohoOauthInputSchema<Regions>,
  input: unknown
): ZohoOauthInput<Regions[number]> => {
  let parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    throw createApiServiceError('Select a supported Zoho application type and region.', {
      reason: 'zoho_oauth_input'
    });
  }
  if (parsed.data.applicationType === 'regional' && !parsed.data.region) {
    throw createApiServiceError(
      'Select a supported Zoho region when using a regional application.',
      { reason: 'zoho_oauth_region' }
    );
  }
  return parsed.data;
};

let resolveCallbackAccountsOrigin = <Regions extends readonly ZohoRegion[]>(
  supportedRegions: Regions,
  expectedRegion: Regions[number] | undefined,
  callbackParams?: Record<string, string>
) => {
  let location = callbackParams?.location;
  let accountsOrigin = callbackParams?.['accounts-server'];

  if (!location) throw invalidCallback('the location parameter is required.');
  if (!accountsOrigin) {
    throw invalidCallback('the accounts-server parameter is required.');
  }

  let locationRegion = getZohoRegionForCallbackLocation(location);
  if (!locationRegion) throw invalidCallback('the location parameter is not recognized.');

  let accountsRegion = getZohoRegionForAccountsOrigin(accountsOrigin);
  if (!accountsRegion) {
    throw invalidCallback('the accounts-server parameter is not an allowed Accounts origin.');
  }

  if (locationRegion !== accountsRegion) {
    throw invalidCallback('location and accounts-server identify different regions.');
  }
  if (!supportedRegions.includes(locationRegion)) {
    throw invalidCallback('the callback region is not supported by this integration.');
  }
  if (expectedRegion !== undefined && locationRegion !== expectedRegion) {
    throw invalidCallback('the callback region does not match the expected region.');
  }

  return { accountsUrl: accountsOrigin, region: locationRegion as Regions[number] };
};

let getAllowedApiOrigins = <Regions extends readonly ZohoRegion[]>(
  apiOrigins: ZohoApiOrigins<Regions>,
  region: Regions[number]
) => apiOrigins[region] as readonly string[];

let resolveApiDomain = <Regions extends readonly ZohoRegion[]>(
  apiOrigins: ZohoApiOrigins<Regions>,
  region: Regions[number],
  apiDomain: unknown,
  previousApiDomain?: string
) => {
  let resolvedApiDomain = apiDomain === undefined ? previousApiDomain : apiDomain;
  if (
    typeof resolvedApiDomain !== 'string' ||
    !getAllowedApiOrigins(apiOrigins, region).includes(resolvedApiDomain)
  ) {
    throw createApiServiceError(
      `Zoho OAuth token response returned an invalid API domain for region "${region}".`,
      { reason: 'zoho_oauth_api_domain' }
    );
  }
  return resolvedApiDomain;
};

let getTokenResponseApiDomain = (data: unknown) =>
  typeof data === 'object' && data !== null && !Array.isArray(data)
    ? (data as Record<string, unknown>).api_domain
    : undefined;

let validateStoredOutput = <Regions extends readonly ZohoRegion[]>(
  supportedRegions: Regions,
  apiOrigins: ZohoApiOrigins<Regions>,
  output: ZohoOauthOutput,
  input: ZohoOauthInput<Regions[number]>
) => {
  if (typeof output !== 'object' || output === null || Array.isArray(output)) {
    throw invalidOutput('OAuth output must be an object.');
  }
  if (typeof output.token !== 'string' || !output.token) {
    throw invalidOutput('the access token is missing.');
  }
  if (output.applicationType !== 'multi_dc' && output.applicationType !== 'regional') {
    throw invalidOutput('the stored application type is invalid.');
  }
  if (output.applicationType !== input.applicationType) {
    throw invalidOutput('the stored application type does not match the auth input.');
  }
  if (!supportedRegions.includes(output.region)) {
    throw invalidOutput('the stored region is not supported.');
  }
  if (input.region !== undefined && output.region !== input.region) {
    throw invalidOutput('the stored region does not match the expected region.');
  }
  if (output.accountsUrl !== ZOHO_REGION_METADATA[output.region].accountsOrigin) {
    throw invalidOutput('the stored Accounts origin does not match the stored region.');
  }
  resolveApiDomain(apiOrigins, output.region, output.apiDomain);
};

let formRequestConfig = {
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
};

let toZohoOauthError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'Zoho',
    operation,
    reason: 'zoho_oauth_request',
    fallbackMessage: 'Unknown OAuth error'
  });

export let createZohoOauth = <const Regions extends readonly ZohoRegion[]>({
  supportedRegions,
  scopes,
  apiOrigins,
  profile,
  extendOutput
}: ZohoOauthOptions<Regions>) => {
  validateZohoSupportedRegions(supportedRegions);
  validateApiOriginConfiguration(supportedRegions, apiOrigins);

  let regionSchema = createZohoRegionSchema(supportedRegions);
  let inputSchema = z.object({
    applicationType: z
      .enum(['multi_dc', 'regional'])
      .describe(
        'Type of Zoho OAuth application. Choose multi_dc for a Multi-DC application; no region selection is required. Choose regional for a regional application; region is required.'
      ),
    region: regionSchema
      .optional()
      .describe(
        'Zoho data-center region. Required for a regional application and optional for a Multi-DC application.'
      )
  });

  let oauth = {
    type: 'auth.oauth' as const,
    name: 'OAuth',
    key: 'oauth',
    scopes,
    inputSchema,

    getAuthorizationUrl: async (ctx: ZohoAuthorizationUrlContext<Regions[number]>) => {
      let input = resolveInput(inputSchema, ctx.input);
      let authorizationOrigin =
        input.applicationType === 'regional'
          ? ZOHO_REGION_METADATA[input.region!].accountsOrigin
          : ZOHO_REGION_METADATA.us.accountsOrigin;
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        scope: ctx.scopes.join(','),
        access_type: 'offline',
        prompt: 'consent',
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      return { url: `${authorizationOrigin}/oauth/v2/auth?${params.toString()}` };
    },

    handleCallback: async (ctx: ZohoCallbackContext<Regions[number]>) => {
      let input = resolveInput(inputSchema, ctx.input);
      let { accountsUrl, region } = resolveCallbackAccountsOrigin(
        supportedRegions,
        input.region,
        ctx.callbackParams
      );

      try {
        let response = await createAxios({ baseURL: accountsUrl }).post(
          '/oauth/v2/token',
          new URLSearchParams({
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            code: ctx.code,
            redirect_uri: ctx.redirectUri,
            grant_type: 'authorization_code'
          }).toString(),
          formRequestConfig
        );
        let token = normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'Zoho',
          operation: 'token exchange',
          refreshTokenFallbackMode: 'falsy'
        });
        let apiDomain = resolveApiDomain(
          apiOrigins,
          region,
          getTokenResponseApiDomain(response.data)
        );
        let canonicalOutput: ZohoOauthOutput<Regions[number]> = {
          token: token.token,
          refreshToken: token.refreshToken,
          expiresAt: token.expiresAt,
          applicationType: input.applicationType,
          region,
          accountsUrl,
          apiDomain
        };
        let extension = await extendOutput?.({
          input: { applicationType: input.applicationType, region },
          scopes: ctx.scopes,
          output: canonicalOutput
        });

        return {
          output: {
            ...extension,
            ...canonicalOutput
          }
        };
      } catch (error) {
        throw toZohoOauthError(error, 'token exchange');
      }
    },

    handleTokenRefresh: async (ctx: ZohoTokenRefreshContext<Regions[number]>) => {
      let input = resolveInput(inputSchema, ctx.input);
      validateStoredOutput(supportedRegions, apiOrigins, ctx.output, input);
      if (typeof ctx.output.refreshToken !== 'string' || !ctx.output.refreshToken) {
        throw invalidOutput('the refresh token is missing. Reconnect the Zoho account.');
      }

      try {
        let response = await createAxios({ baseURL: ctx.output.accountsUrl }).post(
          '/oauth/v2/token',
          new URLSearchParams({
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret,
            refresh_token: ctx.output.refreshToken,
            grant_type: 'refresh_token'
          }).toString(),
          formRequestConfig
        );
        let token = normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'Zoho',
          operation: 'token refresh',
          previousRefreshToken: ctx.output.refreshToken,
          refreshTokenFallbackMode: 'falsy'
        });
        let apiDomain = resolveApiDomain(
          apiOrigins,
          ctx.output.region,
          getTokenResponseApiDomain(response.data),
          ctx.output.apiDomain
        );
        let canonicalOutput: ZohoOauthOutput<Regions[number]> = {
          ...ctx.output,
          token: token.token,
          refreshToken: token.refreshToken,
          expiresAt: token.expiresAt,
          applicationType: ctx.output.applicationType,
          region: ctx.output.region,
          accountsUrl: ctx.output.accountsUrl,
          apiDomain
        };

        return { output: canonicalOutput };
      } catch (error) {
        throw toZohoOauthError(error, 'token refresh');
      }
    }
  };

  if (!profile) return oauth;

  return {
    ...oauth,
    getProfile: async (ctx: ZohoProfileHookContext<Regions[number]>) => {
      let input = resolveInput(inputSchema, ctx.input);
      validateStoredOutput(supportedRegions, apiOrigins, ctx.output, input);

      try {
        return {
          profile: await profile({
            ...ctx,
            input: {
              applicationType: input.applicationType,
              region: ctx.output.region
            }
          })
        };
      } catch (error) {
        throw toZohoOauthError(error, 'profile request');
      }
    }
  };
};
