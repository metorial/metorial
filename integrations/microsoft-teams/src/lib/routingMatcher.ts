import { normalizeAppId } from './botFramework';

/** Tenant value for connections of a multi-tenant bot, which receive every tenant's activity. */
export let TEAMS_ANY_TENANT = '*';

/**
 * One shared builder for both sides of Bot Framework routing:
 * `.routingMatchers` (connection auth) and `process` (the verified JWT
 * audience plus the activity's tenant). A connection with a tenant ID only
 * receives that tenant's activity; one without receives every tenant's.
 */
export let buildTeamsBotRoutingMatcher = (
  appId: string,
  tenantId: string = TEAMS_ANY_TENANT
) => ({
  installType: 'bot_framework' as const,
  appId: normalizeAppId(appId),
  tenantId: tenantId === TEAMS_ANY_TENANT ? tenantId : tenantId.trim().toLowerCase()
});

export let buildTeamsBotConnectionRoutingMatchers = (auth: {
  appId?: string;
  tenantId?: string;
}) =>
  auth.appId ? [buildTeamsBotRoutingMatcher(auth.appId, auth.tenantId || undefined)] : [];

/** Matchers for one activity: every connection of the bot, plus those scoped to its tenant. */
export let buildTeamsBotActivityRoutingMatchers = (
  appId: string,
  tenantId: string | undefined
) => [
  buildTeamsBotRoutingMatcher(appId),
  ...(tenantId ? [buildTeamsBotRoutingMatcher(appId, tenantId)] : [])
];
