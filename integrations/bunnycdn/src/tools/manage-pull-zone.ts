import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoreClient } from '../lib/client';
import { spec } from '../spec';

let pullZoneSchema = z
  .object({
    pullZoneId: z.number().describe('Unique ID of the pull zone'),
    name: z.string().describe('Name of the pull zone'),
    originUrl: z.string().optional().describe('Origin server URL'),
    enabled: z.boolean().optional().describe('Whether the pull zone is enabled'),
    hostnames: z
      .array(
        z.object({
          value: z.string().describe('Hostname value'),
          forceSSL: z.boolean().optional().describe('Whether SSL is forced'),
          isSystemHostname: z
            .boolean()
            .optional()
            .describe('Whether this is a system hostname'),
          hasCertificate: z
            .boolean()
            .optional()
            .describe('Whether a certificate is configured')
        })
      )
      .optional()
      .describe('Configured hostnames'),
    storageZoneId: z.number().optional().describe('Linked storage zone ID'),
    cacheControlMaxAgeOverride: z
      .number()
      .optional()
      .describe('Cache control max age override in seconds'),
    monthlyBandwidthUsed: z.number().optional().describe('Monthly bandwidth used in bytes'),
    monthlyCharges: z.number().optional().describe('Monthly charges in USD'),
    zoneSecurityEnabled: z
      .boolean()
      .optional()
      .describe('Whether token authentication is enabled'),
    type: z.number().optional().describe('Zone type: 0=Premium, 1=Volume'),
    allowedReferrers: z.array(z.string()).optional().describe('Allowed referrer domains'),
    blockedReferrers: z.array(z.string()).optional().describe('Blocked referrer domains'),
    blockedIps: z.array(z.string()).optional().describe('Blocked IP addresses'),
    enableGeoZoneUS: z.boolean().optional(),
    enableGeoZoneEU: z.boolean().optional(),
    enableGeoZoneASIA: z.boolean().optional(),
    enableGeoZoneSA: z.boolean().optional(),
    enableGeoZoneAF: z.boolean().optional()
  })
  .passthrough();

export let managePullZone = SlateTool.create(spec, {
  name: 'Manage Pull Zone',
  key: 'manage_pull_zone',
  description: `Create, update, retrieve, or delete a CDN pull zone. Pull zones define how content is cached and delivered from origin servers across bunny.net's global network. Supports configuring origin URLs, caching rules, hostnames, geo-restrictions, referrer blocking, IP blocking, and security settings.`,
  instructions: [
    'Use action "list" to search and browse pull zones.',
    'Use action "get" to retrieve full details of a specific pull zone.',
    'Use action "create" to set up a new pull zone with an origin URL or linked storage zone.',
    'Use action "update" to modify settings on an existing pull zone.',
    'Use action "delete" to permanently remove a pull zone.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('The operation to perform'),
      pullZoneId: z
        .number()
        .optional()
        .describe('Pull zone ID. Required for get, update, and delete actions.'),
      search: z
        .string()
        .optional()
        .describe('Search term for filtering pull zones (list action only)'),
      page: z.number().optional().describe('Page number for pagination (list action only)'),
      perPage: z
        .number()
        .optional()
        .describe('Number of results per page, max 1000 (list action only)'),
      name: z.string().optional().describe('Name for the pull zone (create action)'),
      originUrl: z.string().optional().describe('Origin server URL (create/update)'),
      storageZoneId: z.number().optional().describe('Storage zone ID to link (create/update)'),
      type: z.number().optional().describe('Zone type: 0=Premium, 1=Volume (create)'),
      enableGeoZoneUS: z.boolean().optional().describe('Enable US geo zone (create/update)'),
      enableGeoZoneEU: z.boolean().optional().describe('Enable EU geo zone (create/update)'),
      enableGeoZoneASIA: z
        .boolean()
        .optional()
        .describe('Enable Asia geo zone (create/update)'),
      enableGeoZoneSA: z
        .boolean()
        .optional()
        .describe('Enable South America geo zone (create/update)'),
      enableGeoZoneAF: z
        .boolean()
        .optional()
        .describe('Enable Africa geo zone (create/update)'),
      allowedReferrers: z
        .array(z.string())
        .optional()
        .describe('List of allowed referrer domains (create/update)'),
      blockedReferrers: z
        .array(z.string())
        .optional()
        .describe('List of blocked referrer domains (create/update)'),
      blockedIps: z
        .array(z.string())
        .optional()
        .describe('List of blocked IP addresses (create/update)'),
      zoneSecurityEnabled: z
        .boolean()
        .optional()
        .describe('Enable token authentication (create/update)'),
      ignoreQueryStrings: z
        .boolean()
        .optional()
        .describe('Ignore query strings for caching (create/update)'),
      enableAutoSSL: z.boolean().optional().describe('Enable automatic SSL (create/update)'),
      enableWebSockets: z
        .boolean()
        .optional()
        .describe('Enable WebSocket support (create/update)'),
      cacheControlMaxAgeOverride: z
        .number()
        .optional()
        .describe('Cache control max age override in seconds (update)'),
      verifyOriginSSL: z
        .boolean()
        .optional()
        .describe('Verify origin SSL certificate (create/update)')
    })
  )
  .output(
    z.object({
      pullZone: pullZoneSchema
        .optional()
        .describe('Pull zone details (for get, create, update)'),
      pullZones: z
        .array(pullZoneSchema)
        .optional()
        .describe('List of pull zones (for list action)'),
      totalItems: z
        .number()
        .optional()
        .describe('Total number of pull zones (for list action)'),
      currentPage: z.number().optional().describe('Current page number (for list action)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the pull zone was deleted (for delete action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoreClient({ token: ctx.auth.token });

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listPullZones({
          page: ctx.input.page,
          perPage: ctx.input.perPage,
          search: ctx.input.search
        });
        return {
          output: {
            pullZones: result.Items || [],
            totalItems: result.TotalItems,
            currentPage: result.CurrentPage
          },
          message: `Found **${result.TotalItems}** pull zones (page ${result.CurrentPage}).`
        };
      }
      case 'get': {
        let zone = await client.getPullZone(ctx.input.pullZoneId!);
        return {
          output: { pullZone: zone },
          message: `Retrieved pull zone **${zone.Name}** (ID: ${zone.Id}).`
        };
      }
      case 'create': {
        let data: Record<string, any> = {};
        if (ctx.input.name) data.Name = ctx.input.name;
        if (ctx.input.originUrl) data.OriginUrl = ctx.input.originUrl;
        if (ctx.input.storageZoneId) data.StorageZoneId = ctx.input.storageZoneId;
        if (ctx.input.type !== undefined) data.Type = ctx.input.type;
        if (ctx.input.enableGeoZoneUS !== undefined)
          data.EnableGeoZoneUS = ctx.input.enableGeoZoneUS;
        if (ctx.input.enableGeoZoneEU !== undefined)
          data.EnableGeoZoneEU = ctx.input.enableGeoZoneEU;
        if (ctx.input.enableGeoZoneASIA !== undefined)
          data.EnableGeoZoneASIA = ctx.input.enableGeoZoneASIA;
        if (ctx.input.enableGeoZoneSA !== undefined)
          data.EnableGeoZoneSA = ctx.input.enableGeoZoneSA;
        if (ctx.input.enableGeoZoneAF !== undefined)
          data.EnableGeoZoneAF = ctx.input.enableGeoZoneAF;
        if (ctx.input.allowedReferrers) data.AllowedReferrers = ctx.input.allowedReferrers;
        if (ctx.input.blockedReferrers) data.BlockedReferrers = ctx.input.blockedReferrers;
        if (ctx.input.blockedIps) data.BlockedIps = ctx.input.blockedIps;
        if (ctx.input.zoneSecurityEnabled !== undefined)
          data.ZoneSecurityEnabled = ctx.input.zoneSecurityEnabled;
        if (ctx.input.ignoreQueryStrings !== undefined)
          data.IgnoreQueryStrings = ctx.input.ignoreQueryStrings;
        if (ctx.input.enableAutoSSL !== undefined)
          data.EnableAutoSSL = ctx.input.enableAutoSSL;
        if (ctx.input.enableWebSockets !== undefined)
          data.EnableWebSockets = ctx.input.enableWebSockets;
        if (ctx.input.verifyOriginSSL !== undefined)
          data.VerifyOriginSSL = ctx.input.verifyOriginSSL;

        let zone = await client.createPullZone(data);
        return {
          output: { pullZone: zone },
          message: `Created pull zone **${zone.Name}** (ID: ${zone.Id}).`
        };
      }
      case 'update': {
        let data: Record<string, any> = {};
        if (ctx.input.originUrl !== undefined) data.OriginUrl = ctx.input.originUrl;
        if (ctx.input.storageZoneId !== undefined)
          data.StorageZoneId = ctx.input.storageZoneId;
        if (ctx.input.enableGeoZoneUS !== undefined)
          data.EnableGeoZoneUS = ctx.input.enableGeoZoneUS;
        if (ctx.input.enableGeoZoneEU !== undefined)
          data.EnableGeoZoneEU = ctx.input.enableGeoZoneEU;
        if (ctx.input.enableGeoZoneASIA !== undefined)
          data.EnableGeoZoneASIA = ctx.input.enableGeoZoneASIA;
        if (ctx.input.enableGeoZoneSA !== undefined)
          data.EnableGeoZoneSA = ctx.input.enableGeoZoneSA;
        if (ctx.input.enableGeoZoneAF !== undefined)
          data.EnableGeoZoneAF = ctx.input.enableGeoZoneAF;
        if (ctx.input.allowedReferrers) data.AllowedReferrers = ctx.input.allowedReferrers;
        if (ctx.input.blockedReferrers) data.BlockedReferrers = ctx.input.blockedReferrers;
        if (ctx.input.blockedIps) data.BlockedIps = ctx.input.blockedIps;
        if (ctx.input.zoneSecurityEnabled !== undefined)
          data.ZoneSecurityEnabled = ctx.input.zoneSecurityEnabled;
        if (ctx.input.ignoreQueryStrings !== undefined)
          data.IgnoreQueryStrings = ctx.input.ignoreQueryStrings;
        if (ctx.input.enableAutoSSL !== undefined)
          data.EnableAutoSSL = ctx.input.enableAutoSSL;
        if (ctx.input.enableWebSockets !== undefined)
          data.EnableWebSockets = ctx.input.enableWebSockets;
        if (ctx.input.cacheControlMaxAgeOverride !== undefined)
          data.CacheControlMaxAgeOverride = ctx.input.cacheControlMaxAgeOverride;
        if (ctx.input.verifyOriginSSL !== undefined)
          data.VerifyOriginSSL = ctx.input.verifyOriginSSL;

        let zone = await client.updatePullZone(ctx.input.pullZoneId!, data);
        return {
          output: { pullZone: zone },
          message: `Updated pull zone **${ctx.input.pullZoneId}**.`
        };
      }
      case 'delete': {
        await client.deletePullZone(ctx.input.pullZoneId!);
        return {
          output: { deleted: true },
          message: `Deleted pull zone **${ctx.input.pullZoneId}**.`
        };
      }
    }
  })
  .build();
