import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let bindingSchema = z
  .record(z.string(), z.any())
  .describe(
    'Cloudflare Worker binding object from the multipart upload metadata docs, such as a plain_text, secret_text, kv_namespace, r2_bucket, d1, queue, durable_object_namespace, or service binding.'
  );

let observabilityInputSchema = z.object({
  enabled: z.boolean().optional().describe('Enable or disable Workers observability'),
  headSamplingRate: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Head sampling rate from 0.0 to 1.0')
});

export let uploadWorkerModule = SlateTool.create(spec, {
  name: 'Upload Worker Module',
  key: 'upload_worker_module',
  description: `Create or replace a Worker script by uploading code and multipart metadata. This is the full Worker upload path for changing code plus bindings, compatibility settings, observability, placement, Logpush, or version annotations.`,
  instructions: [
    'For ES module Workers, leave syntax as module and export a fetch handler from the uploaded module.',
    'For service-worker syntax, set syntax to service_worker and provide event-listener style source code.',
    'Use put_script_content for code-only updates that should not touch existing configuration or metadata.'
  ]
})
  .input(
    z.object({
      scriptName: z.string().describe('Name of the Worker script to create or replace'),
      scriptContent: z.string().describe('Worker source code to upload'),
      syntax: z
        .enum(['module', 'service_worker'])
        .optional()
        .describe('Worker syntax for the uploaded code. Defaults to module syntax.'),
      moduleName: z
        .string()
        .optional()
        .describe(
          'Filename for the uploaded code part. Defaults to index.js for module syntax and worker.js for service-worker syntax.'
        ),
      contentType: z.string().optional().describe('MIME type for the uploaded code part'),
      compatibilityDate: z
        .string()
        .optional()
        .describe('Worker compatibility date in YYYY-MM-DD format'),
      compatibilityFlags: z
        .array(z.string())
        .optional()
        .describe('Worker compatibility flags to apply'),
      bindings: z
        .array(bindingSchema)
        .optional()
        .describe('Complete binding list for the uploaded Worker metadata'),
      usageModel: z.string().optional().describe('Worker usage model'),
      logpush: z.boolean().optional().describe('Enable or disable Workers Logpush'),
      observability: observabilityInputSchema
        .optional()
        .describe('Workers observability configuration'),
      placementMode: z.string().optional().describe('Smart Placement mode'),
      message: z
        .string()
        .max(1000)
        .optional()
        .describe('Human-readable annotation for the uploaded version'),
      tag: z.string().max(100).optional().describe('User-provided version tag annotation'),
      bindingsInheritStrict: z
        .boolean()
        .optional()
        .describe('When true, fail the upload if inherited bindings cannot be resolved')
    })
  )
  .output(
    z.object({
      scriptId: z.string().describe('Worker script identifier'),
      createdOn: z.string().optional().describe('ISO 8601 creation timestamp'),
      modifiedOn: z.string().optional().describe('ISO 8601 last modified timestamp'),
      handlers: z
        .array(z.string())
        .optional()
        .describe('Event handlers defined by the Worker'),
      hasModules: z.boolean().optional().describe('Whether the Worker uses ES modules'),
      compatibilityDate: z.string().optional().describe('Compatibility date'),
      compatibilityFlags: z.array(z.string()).optional().describe('Compatibility flags'),
      lastDeployedFrom: z.string().optional().describe('Source of the latest deployment')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.uploadWorkerModule({
      scriptName: ctx.input.scriptName,
      scriptContent: ctx.input.scriptContent,
      syntax: ctx.input.syntax,
      moduleName: ctx.input.moduleName,
      contentType: ctx.input.contentType,
      compatibilityDate: ctx.input.compatibilityDate,
      compatibilityFlags: ctx.input.compatibilityFlags,
      bindings: ctx.input.bindings,
      usageModel: ctx.input.usageModel,
      logpush: ctx.input.logpush,
      observability: ctx.input.observability,
      placementMode: ctx.input.placementMode,
      message: ctx.input.message,
      tag: ctx.input.tag,
      bindingsInheritStrict: ctx.input.bindingsInheritStrict
    });

    return {
      output: {
        scriptId: result?.id || ctx.input.scriptName,
        createdOn: result?.created_on,
        modifiedOn: result?.modified_on,
        handlers: result?.handlers,
        hasModules: result?.has_modules,
        compatibilityDate: result?.compatibility_date,
        compatibilityFlags: result?.compatibility_flags,
        lastDeployedFrom: result?.last_deployed_from
      },
      message: `Uploaded Worker **${ctx.input.scriptName}**.`
    };
  })
  .build();
