import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let appOutputSchema = z.object({
  appId: z.string().optional().describe('App UUID'),
  name: z.string().optional().describe('App name'),
  organizationId: z.string().optional().describe('Organization UUID'),
  players: z.number().optional().describe('Total subscription count'),
  messageablePlayers: z
    .number()
    .optional()
    .describe('Subscriptions that can receive messages'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let mapApp = (a: any) => ({
  appId: a.id,
  name: a.name,
  organizationId: a.organization_id,
  players: a.players,
  messageablePlayers: a.messageable_players,
  createdAt: a.created_at,
  updatedAt: a.updated_at
});

export let listApps = SlateTool.create(spec, {
  name: 'List Apps',
  key: 'list_apps',
  description: `Retrieve all OneSignal apps under your organization. Requires an Organization API Key.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      apps: z.array(appOutputSchema).describe('List of apps')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appId: ctx.config.appId
    });

    let result = await client.listApps();
    let apps = (Array.isArray(result) ? result : []).map(mapApp);

    return {
      output: { apps },
      message: `Found **${apps.length}** app(s).`
    };
  })
  .build();

export let getApp = SlateTool.create(spec, {
  name: 'Get App',
  key: 'get_app',
  description: `Retrieve details for a specific OneSignal app by ID. Requires an Organization API Key.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      targetAppId: z
        .string()
        .describe('App ID to retrieve (defaults to the configured App ID if omitted)')
        .optional()
    })
  )
  .output(appOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appId: ctx.config.appId
    });

    let appId = ctx.input.targetAppId || ctx.config.appId;
    let result = await client.getApp(appId);

    return {
      output: mapApp(result),
      message: `Retrieved app **${result.name || appId}**.`
    };
  })
  .build();

export let createApp = SlateTool.create(spec, {
  name: 'Create App',
  key: 'create_app',
  description: `Create a new OneSignal app under your organization. Requires an Organization API Key. Optionally configure platform-specific push settings.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('App name'),
      organizationId: z.string().describe('Organization UUID'),
      siteName: z.string().optional().describe('Web push site name'),
      chromeWebOrigin: z.string().optional().describe('Web push origin URL'),
      apnsKeyId: z.string().optional().describe('iOS APNs Key ID (p8 auth)'),
      apnsTeamId: z.string().optional().describe('iOS APNs Team ID'),
      apnsBundleId: z.string().optional().describe('iOS APNs Bundle ID'),
      apnsP8: z.string().optional().describe('iOS APNs p8 key contents'),
      fcmV1ServiceAccountJson: z
        .string()
        .optional()
        .describe('Base64-encoded Firebase service account JSON for Android')
    })
  )
  .output(appOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appId: ctx.config.appId
    });

    let body: Record<string, any> = {
      name: ctx.input.name,
      organization_id: ctx.input.organizationId
    };
    if (ctx.input.siteName) body.site_name = ctx.input.siteName;
    if (ctx.input.chromeWebOrigin) body.chrome_web_origin = ctx.input.chromeWebOrigin;
    if (ctx.input.apnsKeyId) body.apns_key_id = ctx.input.apnsKeyId;
    if (ctx.input.apnsTeamId) body.apns_team_id = ctx.input.apnsTeamId;
    if (ctx.input.apnsBundleId) body.apns_bundle_id = ctx.input.apnsBundleId;
    if (ctx.input.apnsP8) body.apns_p8 = ctx.input.apnsP8;
    if (ctx.input.fcmV1ServiceAccountJson)
      body.fcm_v1_service_account_json = ctx.input.fcmV1ServiceAccountJson;

    let result = await client.createApp(body);

    return {
      output: mapApp(result),
      message: `App **${ctx.input.name}** created${result.id ? ` with ID **${result.id}**` : ''}.`
    };
  })
  .build();

export let updateApp = SlateTool.create(spec, {
  name: 'Update App',
  key: 'update_app',
  description: `Update an existing OneSignal app's settings. Requires an Organization API Key.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      targetAppId: z.string().describe('App ID to update'),
      name: z.string().optional().describe('New app name'),
      siteName: z.string().optional().describe('Web push site name'),
      chromeWebOrigin: z.string().optional().describe('Web push origin URL'),
      apnsKeyId: z.string().optional().describe('iOS APNs Key ID'),
      apnsTeamId: z.string().optional().describe('iOS APNs Team ID'),
      apnsBundleId: z.string().optional().describe('iOS APNs Bundle ID'),
      apnsP8: z.string().optional().describe('iOS APNs p8 key contents'),
      fcmV1ServiceAccountJson: z
        .string()
        .optional()
        .describe('Base64-encoded Firebase service account JSON')
    })
  )
  .output(appOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appId: ctx.config.appId
    });

    let body: Record<string, any> = {};
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.siteName) body.site_name = ctx.input.siteName;
    if (ctx.input.chromeWebOrigin) body.chrome_web_origin = ctx.input.chromeWebOrigin;
    if (ctx.input.apnsKeyId) body.apns_key_id = ctx.input.apnsKeyId;
    if (ctx.input.apnsTeamId) body.apns_team_id = ctx.input.apnsTeamId;
    if (ctx.input.apnsBundleId) body.apns_bundle_id = ctx.input.apnsBundleId;
    if (ctx.input.apnsP8) body.apns_p8 = ctx.input.apnsP8;
    if (ctx.input.fcmV1ServiceAccountJson)
      body.fcm_v1_service_account_json = ctx.input.fcmV1ServiceAccountJson;

    let result = await client.updateApp(ctx.input.targetAppId, body);

    return {
      output: mapApp(result),
      message: `App **${ctx.input.targetAppId}** updated.`
    };
  })
  .build();
