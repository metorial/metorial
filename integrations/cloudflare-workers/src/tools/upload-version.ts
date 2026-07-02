import { SlateTool } from 'slates';
import { z } from 'zod';
import { cloudflareWorkersServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let bindingSchema = z
  .record(z.string(), z.any())
  .describe('Cloudflare Worker binding object from multipart upload metadata.');

export let uploadVersion = SlateTool.create(spec, {
  name: 'Upload Worker Version',
  key: 'upload_version',
  description: `Upload a new deployable Worker version without deploying it. Use create_deployment afterwards to route traffic to the returned version ID.`,
  instructions: [
    'Version upload requires module syntax. Provide source code that exports a fetch handler from the main module.',
    'A version is not deployed until create_deployment is called.'
  ]
})
  .input(
    z.object({
      scriptName: z.string().describe('Name of the Worker script'),
      scriptContent: z.string().describe('Worker module source code for the new version'),
      moduleName: z
        .string()
        .optional()
        .describe('Filename for the uploaded main module. Defaults to index.js.'),
      contentType: z.string().optional().describe('MIME type for the uploaded module'),
      compatibilityDate: z
        .string()
        .optional()
        .describe('Worker compatibility date in YYYY-MM-DD format'),
      compatibilityFlags: z.array(z.string()).optional().describe('Compatibility flags'),
      bindings: z.array(bindingSchema).optional().describe('Complete binding list'),
      usageModel: z.string().optional().describe('Worker usage model'),
      message: z
        .string()
        .max(1000)
        .optional()
        .describe('Human-readable annotation for the version'),
      tag: z.string().max(100).optional().describe('User-provided version tag'),
      alias: z.string().max(63).optional().describe('Associated alias for the version'),
      bindingsInheritStrict: z
        .boolean()
        .optional()
        .describe('When true, fail the upload if inherited bindings cannot be resolved')
    })
  )
  .output(
    z.object({
      versionId: z.string().describe('Created version UUID'),
      number: z.number().optional().describe('Sequential version number'),
      createdOn: z.string().optional().describe('ISO 8601 creation timestamp'),
      source: z.string().optional().describe('Source that created this version')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.uploadVersion({
      scriptName: ctx.input.scriptName,
      scriptContent: ctx.input.scriptContent,
      moduleName: ctx.input.moduleName,
      contentType: ctx.input.contentType,
      compatibilityDate: ctx.input.compatibilityDate,
      compatibilityFlags: ctx.input.compatibilityFlags,
      bindings: ctx.input.bindings,
      usageModel: ctx.input.usageModel,
      message: ctx.input.message,
      tag: ctx.input.tag,
      alias: ctx.input.alias,
      bindingsInheritStrict: ctx.input.bindingsInheritStrict
    });

    if (!result?.id) {
      throw cloudflareWorkersServiceError(
        'Cloudflare did not return a version ID for the uploaded Worker version.'
      );
    }

    return {
      output: {
        versionId: result.id,
        number: result.number,
        createdOn: result.metadata?.created_on,
        source: result.metadata?.source
      },
      message: `Uploaded version **${result.id}** for Worker **${ctx.input.scriptName}**.`
    };
  })
  .build();
