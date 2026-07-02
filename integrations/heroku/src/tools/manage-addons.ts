import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { herokuServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageAddons = SlateTool.create(spec, {
  name: 'Manage Add-ons',
  key: 'manage_addons',
  description: `List, provision, update, or remove add-on services for a Heroku app. Use **action** to specify the operation:
- \`list\`: List all add-ons for an app (or all add-ons across apps).
- \`get\`: Get details of a specific add-on.
- \`create\`: Provision a new add-on for an app.
- \`update\`: Change plan or name of an existing add-on.
- \`delete\`: Remove an add-on from an app.`,
  instructions: [
    'For "list", omit appIdOrName to list add-ons across all apps.',
    'For "create", provide a plan identifier like "heroku-postgresql:essential-0".'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      appIdOrName: z
        .string()
        .optional()
        .describe('App name or ID (required for create and delete)'),
      addonIdOrName: z
        .string()
        .optional()
        .describe('Add-on name or ID (required for get, update, delete)'),
      plan: z
        .string()
        .optional()
        .describe('Add-on plan identifier (required for create, optional for update)'),
      addonName: z.string().optional().describe('Custom name for the add-on'),
      addonConfig: z
        .record(z.string(), z.string())
        .optional()
        .describe('Configuration for the add-on (for create)')
    })
  )
  .output(
    z.object({
      addons: z
        .array(
          z.object({
            addonId: z.string().describe('Unique identifier of the add-on'),
            appName: z.string().describe('App the add-on belongs to'),
            name: z.string().describe('Name of the add-on'),
            planName: z.string().describe('Plan name'),
            serviceName: z.string().describe('Service name'),
            state: z.string().describe('Current state of the add-on'),
            webUrl: z.string().nullable().describe('Web URL to manage the add-on'),
            createdAt: z.string().describe('When the add-on was provisioned')
          })
        )
        .optional()
        .describe('List of add-ons'),
      deleted: z.boolean().optional().describe('Whether the add-on was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action } = ctx.input;

    let mapOutput = (addon: any) => ({
      addonId: addon.addonId,
      appName: addon.appName,
      name: addon.name,
      planName: addon.planName,
      serviceName: addon.serviceName,
      state: addon.state,
      webUrl: addon.webUrl,
      createdAt: addon.createdAt
    });

    if (action === 'list') {
      let addons = await client.listAddons(ctx.input.appIdOrName);
      return {
        output: { addons: addons.map(mapOutput) },
        message: `Found **${addons.length}** add-on(s).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.addonIdOrName)
        throw herokuServiceError('addonIdOrName is required for "get" action.');
      let addon = await client.getAddon(ctx.input.addonIdOrName);
      return {
        output: { addons: [mapOutput(addon)] },
        message: `Retrieved add-on **${addon.name}** (${addon.planName}).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.appIdOrName)
        throw herokuServiceError('appIdOrName is required for "create" action.');
      if (!ctx.input.plan) throw herokuServiceError('plan is required for "create" action.');
      let addon = await client.createAddon(ctx.input.appIdOrName, {
        plan: ctx.input.plan,
        name: ctx.input.addonName,
        config: ctx.input.addonConfig
      });
      return {
        output: { addons: [mapOutput(addon)] },
        message: `Provisioned add-on **${addon.name}** (${addon.planName}) for app **${addon.appName}**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.addonIdOrName)
        throw herokuServiceError('addonIdOrName is required for "update" action.');
      let addon = await client.updateAddon(ctx.input.addonIdOrName, {
        plan: ctx.input.plan,
        name: ctx.input.addonName
      });
      return {
        output: { addons: [mapOutput(addon)] },
        message: `Updated add-on **${addon.name}**.`
      };
    }

    // delete
    if (!ctx.input.appIdOrName)
      throw herokuServiceError('appIdOrName is required for "delete" action.');
    if (!ctx.input.addonIdOrName)
      throw herokuServiceError('addonIdOrName is required for "delete" action.');
    await client.deleteAddon(ctx.input.appIdOrName, ctx.input.addonIdOrName);
    return {
      output: { deleted: true },
      message: `Deleted add-on **${ctx.input.addonIdOrName}** from app **${ctx.input.appIdOrName}**.`
    };
  })
  .build();
