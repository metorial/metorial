import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageBuildTrigger = SlateTool.create(spec, {
  name: 'Manage Build Trigger',
  key: 'manage_build_trigger',
  description: `List, create, update, delete, or fire build triggers. Build triggers connect to hosting providers (Vercel, Netlify, etc.) to automatically deploy when content changes. Use the "trigger" action to manually start a deployment.`
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'trigger', 'delete'])
        .describe('Action to perform'),
      buildTriggerId: z
        .string()
        .optional()
        .describe('Build trigger ID (required for get, update, trigger, delete)'),
      name: z.string().optional().describe('Display name for the build trigger'),
      adapter: z
        .enum(['custom', 'netlify', 'vercel', 'gitlab'])
        .optional()
        .describe('Hosting adapter type'),
      adapterSettings: z
        .record(z.string(), z.any())
        .optional()
        .describe('Adapter-specific settings (e.g. trigger_url for custom adapter)'),
      frontendUrl: z.string().optional().describe('Public URL of the deployed site'),
      enabled: z.boolean().optional().describe('Whether the trigger is active')
    })
  )
  .output(
    z.object({
      buildTriggers: z
        .array(z.any())
        .optional()
        .describe('Array of build trigger objects (for list action)'),
      buildTrigger: z.any().optional().describe('Single build trigger object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let { action, buildTriggerId, name, adapter, adapterSettings, frontendUrl, enabled } =
      ctx.input;

    if (action === 'list') {
      let buildTriggers = await client.listBuildTriggers();
      return {
        output: { buildTriggers },
        message: `Found **${buildTriggers.length}** build triggers.`
      };
    }

    if (action === 'get') {
      if (!buildTriggerId) throw new Error('buildTriggerId is required for get action');
      let buildTrigger = await client.getBuildTrigger(buildTriggerId);
      return {
        output: { buildTrigger },
        message: `Retrieved build trigger **${buildTrigger.name}**.`
      };
    }

    if (action === 'create') {
      let attributes: Record<string, any> = {};
      if (name) attributes.name = name;
      if (adapter) attributes.adapter = adapter;
      if (adapterSettings) attributes.adapter_settings = adapterSettings;
      if (frontendUrl) attributes.frontend_url = frontendUrl;
      if (enabled !== undefined) attributes.enabled = enabled;
      let buildTrigger = await client.createBuildTrigger(attributes);
      return {
        output: { buildTrigger },
        message: `Created build trigger **${buildTrigger.name}** (ID: ${buildTrigger.id}).`
      };
    }

    if (action === 'update') {
      if (!buildTriggerId) throw new Error('buildTriggerId is required for update action');
      let attributes: Record<string, any> = {};
      if (name) attributes.name = name;
      if (adapter) attributes.adapter = adapter;
      if (adapterSettings) attributes.adapter_settings = adapterSettings;
      if (frontendUrl) attributes.frontend_url = frontendUrl;
      if (enabled !== undefined) attributes.enabled = enabled;
      let buildTrigger = await client.updateBuildTrigger(buildTriggerId, attributes);
      return {
        output: { buildTrigger },
        message: `Updated build trigger **${buildTrigger.name}**.`
      };
    }

    if (action === 'trigger') {
      if (!buildTriggerId) throw new Error('buildTriggerId is required for trigger action');
      let buildTrigger = await client.triggerBuild(buildTriggerId);
      return {
        output: { buildTrigger },
        message: `Triggered deployment for build trigger **${buildTriggerId}**.`
      };
    }

    if (action === 'delete') {
      if (!buildTriggerId) throw new Error('buildTriggerId is required for delete action');
      let buildTrigger = await client.deleteBuildTrigger(buildTriggerId);
      return {
        output: { buildTrigger },
        message: `Deleted build trigger **${buildTriggerId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
