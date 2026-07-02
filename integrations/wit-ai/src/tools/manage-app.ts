import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let appSchema = z.object({
  appId: z.string().optional().describe('Unique app ID'),
  name: z.string().optional().describe('App name'),
  lang: z.string().optional().describe('Language code of the app'),
  private: z.boolean().optional().describe('Whether the app is private'),
  description: z.string().optional().describe('App description'),
  timezone: z.string().optional().describe('Default timezone of the app'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  lastTrainedAt: z.string().optional().describe('Last training timestamp'),
  trainingStatus: z
    .string()
    .optional()
    .describe('Training status: done, scheduled, or ongoing')
});

export let listApps = SlateTool.create(spec, {
  name: 'List Apps',
  key: 'list_apps',
  description: `List all Wit.ai apps accessible by the current token. Returns app metadata including name, language, and training status. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of apps to return (default: 10)'),
      offset: z.number().optional().describe('Number of apps to skip for pagination')
    })
  )
  .output(
    z.object({
      apps: z.array(appSchema).describe('List of Wit.ai apps')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let apps = await client.listApps(ctx.input.limit, ctx.input.offset);

    return {
      output: {
        apps: (apps ?? []).map((a: Record<string, unknown>) => ({
          appId: a.id ?? a.app_id,
          name: a.name,
          lang: a.lang,
          private: a.private,
          description: a.description,
          timezone: a.timezone,
          createdAt: a.created_at,
          lastTrainedAt: a.last_trained_at,
          trainingStatus: a.training_status
        }))
      },
      message: `Found **${(apps ?? []).length}** app(s).`
    };
  })
  .build();

export let getApp = SlateTool.create(spec, {
  name: 'Get App',
  key: 'get_app',
  description: `Get detailed information about a specific Wit.ai app by its ID. Returns configuration, training status, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appId: z.string().describe('The ID of the Wit.ai app to retrieve')
    })
  )
  .output(appSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let app = await client.getApp(ctx.input.appId);

    return {
      output: {
        appId: app.id ?? app.app_id,
        name: app.name,
        lang: app.lang,
        private: app.private,
        description: app.description,
        timezone: app.timezone,
        createdAt: app.created_at,
        lastTrainedAt: app.last_trained_at,
        trainingStatus: app.training_status
      },
      message: `Retrieved app **${app.name}** (${app.id ?? app.app_id}).`
    };
  })
  .build();

export let createApp = SlateTool.create(spec, {
  name: 'Create App',
  key: 'create_app',
  description: `Create a new Wit.ai app. Returns the new app's ID and server access token that can be used to interact with the app.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the new app'),
      lang: z.string().describe('Language code for the app (e.g., "en")'),
      isPrivate: z.boolean().describe('Whether the app should be private'),
      timezone: z
        .string()
        .optional()
        .describe('Default timezone for the app (e.g., "America/Los_Angeles")')
    })
  )
  .output(
    z.object({
      appId: z.string().describe('ID of the newly created app'),
      accessToken: z.string().describe('Server access token for the new app')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.createApp({
      name: ctx.input.name,
      lang: ctx.input.lang,
      private: ctx.input.isPrivate,
      timezone: ctx.input.timezone
    });

    return {
      output: {
        appId: result.app_id,
        accessToken: result.access_token
      },
      message: `Created app **${ctx.input.name}** with ID \`${result.app_id}\`.`
    };
  })
  .build();

export let updateApp = SlateTool.create(spec, {
  name: 'Update App',
  key: 'update_app',
  description: `Update an existing Wit.ai app's configuration such as name, language, timezone, description, or privacy settings.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      appId: z.string().describe('ID of the app to update'),
      name: z.string().optional().describe('New name for the app'),
      lang: z.string().optional().describe('New language code'),
      isPrivate: z.boolean().optional().describe('Whether the app should be private'),
      timezone: z.string().optional().describe('New default timezone'),
      description: z.string().optional().describe('New description')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let updateData: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
    if (ctx.input.lang !== undefined) updateData.lang = ctx.input.lang;
    if (ctx.input.isPrivate !== undefined) updateData.private = ctx.input.isPrivate;
    if (ctx.input.timezone !== undefined) updateData.timezone = ctx.input.timezone;
    if (ctx.input.description !== undefined) updateData.description = ctx.input.description;

    await client.updateApp(ctx.input.appId, updateData);

    return {
      output: { success: true },
      message: `Updated app \`${ctx.input.appId}\`.`
    };
  })
  .build();

export let deleteApp = SlateTool.create(spec, {
  name: 'Delete App',
  key: 'delete_app',
  description: `Permanently delete a Wit.ai app. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      appId: z.string().describe('ID of the app to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    await client.deleteApp(ctx.input.appId);

    return {
      output: { success: true },
      message: `Deleted app \`${ctx.input.appId}\`.`
    };
  })
  .build();
