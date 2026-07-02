import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getScript = SlateTool.create(spec, {
  name: 'Get Worker Details',
  key: 'get_script',
  description: `Retrieve detailed metadata and settings for a specific Worker script including bindings, compatibility settings, observability config, and placement.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scriptName: z.string().describe('Name of the Worker script')
    })
  )
  .output(
    z.object({
      scriptId: z.string().describe('Worker script identifier'),
      compatibilityDate: z.string().optional().describe('Compatibility date'),
      compatibilityFlags: z.array(z.string()).optional().describe('Compatibility flags'),
      createdOn: z.string().optional().describe('ISO 8601 creation timestamp'),
      modifiedOn: z.string().optional().describe('ISO 8601 last modified timestamp'),
      handlers: z.array(z.string()).optional().describe('Event handlers defined'),
      hasModules: z.boolean().optional().describe('Whether ES modules format is used'),
      lastDeployedFrom: z.string().optional().describe('Source of last deployment'),
      usageModel: z.string().optional().describe('Usage model'),
      logpush: z.boolean().optional().describe('Whether Logpush is enabled'),
      bindings: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Resource bindings configured on the Worker'),
      placementMode: z.string().optional().describe('Smart placement mode'),
      tags: z.array(z.string()).optional().describe('Worker tags')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let settings = await client.getSettings(ctx.input.scriptName);

    let script: any;
    try {
      script = await client.getScript(ctx.input.scriptName);
    } catch {
      script = {};
    }

    return {
      output: {
        scriptId: script.id || ctx.input.scriptName,
        compatibilityDate: settings.compatibility_date || script.compatibility_date,
        compatibilityFlags: settings.compatibility_flags || script.compatibility_flags,
        createdOn: script.created_on,
        modifiedOn: script.modified_on,
        handlers: script.handlers,
        hasModules: script.has_modules,
        lastDeployedFrom: script.last_deployed_from,
        usageModel: settings.usage_model || script.usage_model,
        logpush: settings.logpush ?? script.logpush,
        bindings: settings.bindings,
        placementMode: settings.placement?.mode || script.placement_mode,
        tags: settings.tags || script.tags
      },
      message: `Retrieved details for Worker **${ctx.input.scriptName}**.`
    };
  })
  .build();
