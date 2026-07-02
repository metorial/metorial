import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let tailConsumerSchema = z.object({
  service: z.string().describe('Name of the tail consumer Worker'),
  environment: z.string().optional().describe('Environment of the tail consumer'),
  namespace: z.string().optional().describe('Namespace of the tail consumer')
});

let observabilitySchema = z.object({
  enabled: z.boolean().optional().describe('Whether observability is enabled'),
  headSamplingRate: z.number().optional().describe('Head sampling rate (0.0 to 1.0)')
});

export let getWorkerSettings = SlateTool.create(spec, {
  name: 'Get Worker Settings',
  key: 'get_worker_settings',
  description: `Retrieve the full settings and bindings configuration for a Worker script, including environment variables, KV namespaces, R2 buckets, D1 databases, Queues, Durable Objects, and other bindings.`,
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
      compatibilityDate: z.string().optional().describe('Compatibility date'),
      compatibilityFlags: z.array(z.string()).optional().describe('Compatibility flags'),
      bindings: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('All resource bindings'),
      usageModel: z.string().optional().describe('Usage model'),
      logpush: z.boolean().optional().describe('Whether Logpush is enabled'),
      observability: observabilitySchema.optional().describe('Observability configuration'),
      placementMode: z.string().optional().describe('Smart placement mode'),
      tailConsumers: z
        .array(tailConsumerSchema)
        .optional()
        .describe('Tail consumer configurations'),
      tags: z.array(z.string()).optional().describe('Worker tags')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let settings = await client.getSettings(ctx.input.scriptName);

    return {
      output: {
        compatibilityDate: settings.compatibility_date,
        compatibilityFlags: settings.compatibility_flags,
        bindings: settings.bindings,
        usageModel: settings.usage_model,
        logpush: settings.logpush,
        observability: settings.observability
          ? {
              enabled: settings.observability.enabled,
              headSamplingRate: settings.observability.head_sampling_rate
            }
          : undefined,
        placementMode: settings.placement?.mode,
        tailConsumers: (settings.tail_consumers || []).map((tc: any) => ({
          service: tc.service,
          environment: tc.environment,
          namespace: tc.namespace
        })),
        tags: settings.tags
      },
      message: `Retrieved settings for Worker **${ctx.input.scriptName}** with **${(settings.bindings || []).length}** binding(s).`
    };
  })
  .build();

export let updateScriptSettings = SlateTool.create(spec, {
  name: 'Update Worker Settings',
  key: 'update_script_settings',
  description: `Update script-level settings for a Worker including Logpush, observability, tail consumers, and tags. These settings apply at the script level rather than per-version. Only provided fields are updated.`
})
  .input(
    z.object({
      scriptName: z.string().describe('Name of the Worker script'),
      logpush: z.boolean().optional().describe('Enable or disable Logpush'),
      observability: z
        .object({
          enabled: z.boolean().optional().describe('Enable or disable observability'),
          headSamplingRate: z
            .number()
            .min(0)
            .max(1)
            .optional()
            .describe('Head sampling rate (0.0 to 1.0)')
        })
        .optional()
        .describe('Observability configuration'),
      tailConsumers: z
        .array(
          z.object({
            service: z.string().describe('Tail consumer Worker name'),
            environment: z.string().optional().describe('Environment')
          })
        )
        .optional()
        .describe('Tail consumer Workers for persistent log processing'),
      tags: z.array(z.string()).optional().describe('Worker tags')
    })
  )
  .output(
    z.object({
      logpush: z.boolean().optional().describe('Updated Logpush setting'),
      observability: observabilitySchema.optional().describe('Updated observability config'),
      tailConsumers: z.array(tailConsumerSchema).optional().describe('Updated tail consumers'),
      tags: z.array(z.string()).optional().describe('Updated tags')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let body: Record<string, any> = {};
    if (ctx.input.logpush !== undefined) body.logpush = ctx.input.logpush;
    if (ctx.input.tags !== undefined) body.tags = ctx.input.tags;
    if (ctx.input.tailConsumers !== undefined) {
      body.tail_consumers = ctx.input.tailConsumers.map(tc => ({
        service: tc.service,
        environment: tc.environment
      }));
    }
    if (ctx.input.observability !== undefined) {
      body.observability = {
        enabled: ctx.input.observability.enabled,
        head_sampling_rate: ctx.input.observability.headSamplingRate
      };
    }

    let result = await client.patchScriptSettings(ctx.input.scriptName, body);

    return {
      output: {
        logpush: result.logpush,
        observability: result.observability
          ? {
              enabled: result.observability.enabled,
              headSamplingRate: result.observability.head_sampling_rate
            }
          : undefined,
        tailConsumers: (result.tail_consumers || []).map((tc: any) => ({
          service: tc.service,
          environment: tc.environment,
          namespace: tc.namespace
        })),
        tags: result.tags
      },
      message: `Updated settings for Worker **${ctx.input.scriptName}**.`
    };
  })
  .build();
