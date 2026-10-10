import { normalizeAppId } from './botFramework';

/** Multi-tenant bot connections receive every tenant's activity. */
export let TEAMS_ANY_TENANT = '*';

// Shared by `.routingMatchers` and `process` so both sides compare equal.
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

/** Every connection of the bot, plus those scoped to the activity's tenant. */
export let buildTeamsBotActivityRoutingMatchers = (
  appId: string,
  tenantId: string | undefined
) => [
  buildTeamsBotRoutingMatcher(appId),
  ...(tenantId ? [buildTeamsBotRoutingMatcher(appId, tenantId)] : [])
];
