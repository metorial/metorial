import { SlateTool } from 'slates';
import { z } from 'zod';
import { LightroomClient } from '../lib/lightroom';
import { spec } from '../spec';

let storageRefSchema = z.object({
  href: z.string().describe('URL or path to the file (pre-signed URL for cloud storage)'),
  storage: z.enum(['external', 'azure', 'dropbox']).describe('Storage type')
});

export let applyLightroomEdits = SlateTool.create(spec, {
  name: 'Apply Lightroom Edits',
  key: 'apply_lightroom_edits',
  description: `Apply Lightroom presets, auto-tone, or custom develop settings to an image via the Lightroom Image Editing API (Firefly Services). Input and output files must be hosted on supported cloud storage. The operation is asynchronous.`,
  instructions: [
    'For preset application, provide the XMP preset string.',
    'Auto-tone automatically adjusts exposure, contrast, highlights, shadows, whites, and blacks.'
  ]
})
  .input(
    z.object({
      operation: z
        .enum(['applyPreset', 'autoTone'])
        .describe('Type of Lightroom edit to apply'),
      input: storageRefSchema.describe('Input image location'),
      output: storageRefSchema.describe('Output image location'),
      presetXmp: z
        .string()
        .optional()
        .describe('XMP preset string (required for applyPreset operation)')
    })
  )
  .output(
    z.object({
      jobId: z.string().optional().describe('Async job identifier'),
      status: z.string().describe('Job status'),
      statusUrl: z.string().optional().describe('URL to poll for job status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LightroomClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      orgId: ctx.auth.orgId
    });

    let result: any;

    if (ctx.input.operation === 'applyPreset') {
      if (!ctx.input.presetXmp)
        throw new Error('presetXmp is required for applyPreset operation');
      result = await client.applyPreset(
        ctx.input.input,
        ctx.input.output,
        ctx.input.presetXmp
      );
    } else {
      result = await client.autoTone(ctx.input.input, ctx.input.output);
    }

    return {
      output: {
        jobId: result.jobId || result._links?.self?.href?.split('/').pop(),
        status: result.status || 'submitted',
        statusUrl: result._links?.self?.href || result.links?.self?.href
      },
      message: `Lightroom **${ctx.input.operation}** job submitted. Status: **${result.status || 'submitted'}**.`
    };
  })
  .build();
