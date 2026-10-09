import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse
} from 'slates';

// Bot Connector authentication (bot to connector), public Azure cloud:
// https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-connector-authentication?view=azure-bot-service-4.0#step-1-request-an-access-token-from-the-microsoft-entra-id-account-login-service
export let BOT_FRAMEWORK_TOKEN_SCOPE = 'https://api.botframework.com/.default';
export let BOT_FRAMEWORK_MULTI_TENANT_AUTHORITY = 'botframework.com';

// Global Teams service URL for proactive messaging when no activity-provided
// service URL is available:
// https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages#create-the-conversation
export let TEAMS_GLOBAL_SERVICE_URL = 'https://smba.trafficmanager.net/teams/';

export let BOT_FRAMEWORK_AUTH_METHOD_KEY = 'bot_framework';

let loginAxios = createAxios({ baseURL: 'https://login.microsoftonline.com' });

let GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export let normalizeAppId = (appId: string) => appId.trim().toLowerCase();

export let validateAppId = (appId: string) => {
  let normalized = normalizeAppId(appId);
  if (!GUID_PATTERN.test(normalized)) {
    throw createApiServiceError(
      'Microsoft App ID must be the GUID shown on the Azure Bot resource Configuration page.',
      { reason: 'microsoft_teams_bot_app_id_invalid' }
    );
  }
  return normalized;
};

export let validateTenantId = (tenantId: string | undefined) => {
  let trimmed = tenantId?.trim();
  if (!trimmed) return undefined;
  if (!GUID_PATTERN.test(trimmed)) {
    throw createApiServiceError(
      'Tenant ID must be the Microsoft Entra directory (tenant) GUID of a single-tenant bot.',
      { reason: 'microsoft_teams_bot_tenant_id_invalid' }
    );
  }
  return trimmed.toLowerCase();
};

/**
 * Accepts only Teams Bot Connector hosts in the public and GCC clouds, so the
 * bot token is never sent to an arbitrary host. Government clouds other than
 * GCC use a different token authority and are not supported by this method.
 */
export let isTeamsServiceHost = (hostname: string) => {
  let host = hostname.toLowerCase();
  return host === 'smba.trafficmanager.net' || host.endsWith('.teams.microsoft.com');
};

export let normalizeServiceUrl = (serviceUrl: string | undefined) => {
  let raw = serviceUrl?.trim() || TEAMS_GLOBAL_SERVICE_URL;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw createApiServiceError('Service URL must be a valid HTTPS URL.', {
      reason: 'microsoft_teams_bot_service_url_invalid'
    });
  }

  if (parsed.protocol !== 'https:' || !isTeamsServiceHost(parsed.hostname)) {
    throw createApiServiceError(
      'Service URL must be an HTTPS Microsoft Teams Bot Connector URL, such as https://smba.trafficmanager.net/teams/.',
      { reason: 'microsoft_teams_bot_service_url_invalid' }
    );
  }

  parsed.search = '';
  parsed.hash = '';
  let normalized = parsed.toString();
  return normalized.endsWith('/') ? normalized : `${normalized}/`;
};

export interface BotFrameworkAuthInput {
  appId: string;
  clientSecret: string;
  tenantId?: string;
  serviceUrl?: string;
  botName?: string;
}

export interface BotFrameworkAuthOutput {
  token: string;
  expiresAt?: string;
  appId: string;
  tenantId?: string;
  serviceUrl: string;
  botName?: string;
}

export let requestBotFrameworkToken = async (
  input: BotFrameworkAuthInput,
  operation: string
): Promise<BotFrameworkAuthOutput> => {
  let appId = validateAppId(input.appId);
  let tenantId = validateTenantId(input.tenantId);
  let serviceUrl = normalizeServiceUrl(input.serviceUrl);
  let clientSecret = input.clientSecret?.trim();
  if (!clientSecret) {
    throw createApiServiceError('Client secret is required.', {
      reason: 'microsoft_teams_bot_client_secret_missing'
    });
  }

  let authority = tenantId ?? BOT_FRAMEWORK_MULTI_TENANT_AUTHORITY;

  let response: { data: unknown };
  try {
    response = await loginAxios.post(
      `/${encodeURIComponent(authority)}/oauth2/v2.0/token`,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: appId,
        client_secret: clientSecret,
        scope: BOT_FRAMEWORK_TOKEN_SCOPE
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
  } catch (error) {
    throw buildApiServiceError(error, {
      providerLabel: 'Microsoft Entra ID',
      operation,
      reason: 'microsoft_teams_bot_token_request_failed'
    });
  }

  let token = normalizeOAuthTokenResponse(response.data, {
    providerLabel: 'Microsoft Entra ID',
    operation,
    required: true,
    expiresInType: 'number'
  });

  return {
    token: token.token,
    expiresAt: token.expiresAt,
    appId,
    tenantId,
    serviceUrl,
    botName: input.botName?.trim() || undefined
  };
};
