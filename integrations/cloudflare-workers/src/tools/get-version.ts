import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getVersion = SlateTool.create(spec, {
  name: 'Get Worker Version',
  key: 'get_version',
  description: `Retrieve detailed information about a specific Worker version, including its bindings, runtime configuration, and startup time.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scriptName: z.string().describe('Name of the Worker script'),
      versionId: z.string().describe('UUID of the version to retrieve')
    })
  )
  .output(
    z.object({
      versionId: z.string().describe('Version UUID'),
      number: z.number().optional().describe('Version number'),
      authorEmail: z.string().optional().describe('Author email'),
      createdOn: z.string().optional().describe('ISO 8601 creation timestamp'),
      source: z.string().optional().describe('Source that created this version'),
      startupTimeMs: z.number().optional().describe('Startup time in milliseconds'),
      bindings: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Resource bindings for this version'),
      compatibilityDate: z.string().optional().describe('Compatibility date'),
      compatibilityFlags: z.array(z.string()).optional().describe('Compatibility flags'),
      usageModel: z.string().optional().describe('Usage model'),
      handlers: z.array(z.string()).optional().describe('Event handlers defined')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let v = await client.getVersion(ctx.input.scriptName, ctx.input.versionId);

    return {
      output: {
        versionId: v.id,
        number: v.number,
        authorEmail: v.metadata?.author_email,
        createdOn: v.metadata?.created_on,
        source: v.metadata?.source,
        startupTimeMs: v.startup_time_ms,
        bindings: v.resources?.bindings,
        compatibilityDate: v.resources?.script_runtime?.compatibility_date,
        compatibilityFlags: v.resources?.script_runtime?.compatibility_flags,
        usageModel: v.resources?.script_runtime?.usage_model,
        handlers: v.resources?.script?.handlers
      },
      message: `Retrieved version **${v.id}** (v${v.number || '?'}) for Worker **${ctx.input.scriptName}**.`
    };
  })
  .build();
