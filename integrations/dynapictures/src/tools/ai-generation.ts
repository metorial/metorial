import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, getFileAuthHeaders, requireText } from '../lib/client';
import { spec } from '../spec';

let jobSchema = z.object({
  jobUid: z.string().describe('Generation job identifier'),
  status: z.string().describe('Job state: queued, running, done, or error'),
  resultUrl: z
    .string()
    .optional()
    .describe(
      'Hosted image URL when the job is done; long-term availability is not guaranteed'
    ),
  creditsCharged: z.number().optional().describe('AI credits consumed by a successful job'),
  creditsRemaining: z.number().optional().describe('Remaining workspace AI credits'),
  error: z.string().optional().describe('Provider error message when generation fails'),
  raw: z.record(z.string(), z.unknown()).optional().describe('Complete provider job response')
});

export let startAiGeneration = SlateTool.create(spec, {
  name: 'Start AI Image Generation',
  key: 'start_ai_generation',
  description:
    'Start a standalone AI image generation or editing job using a prompt and optional source or reference images. Returns a job ID for get_ai_generation.',
  instructions: [
    'AI credits are purchased separately from the template image plan.',
    'Poll get_ai_generation about every two seconds until status is done or error.',
    'Current model IDs and supported ratios are listed at https://dynapictures.com/docs/#supported-models.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      modelId: z
        .string()
        .describe('Documented AI model ID, such as flux-2-pro or gemini-3.1-flash-image'),
      prompt: z
        .string()
        .describe('Image description; use [name] tokens to refer to named reference images'),
      ratio: z
        .enum(['1:1', '3:2', '2:3', '16:9', '9:16', '4:3', '3:4'])
        .optional()
        .describe(
          'Aspect ratio; provider defaults to 1:1. GPT Image models support only 1:1, 3:2, and 2:3.'
        ),
      sourceImage: z
        .url()
        .optional()
        .describe('Public image URL to edit; requires an editing-capable model'),
      referenceImages: z
        .array(
          z.object({
            name: z.string().describe('Reference name used as [name] in the prompt'),
            url: z.url().describe('Publicly reachable reference image URL')
          })
        )
        .optional()
        .describe('Ordered source references; input image limits vary by model')
    })
  )
  .output(jobSchema)
  .handleInvocation(async ctx => {
    requireText(ctx.input.modelId, 'Model ID');
    requireText(ctx.input.prompt, 'Prompt');
    for (let reference of ctx.input.referenceImages ?? [])
      requireText(reference.name, 'Reference name');
    let imageCount =
      (ctx.input.sourceImage ? 1 : 0) + (ctx.input.referenceImages?.length ?? 0);
    if (imageCount > 6)
      throw createApiServiceError(
        'At most 6 source and reference images may be supplied; individual models support fewer.'
      );
    if (ctx.input.modelId === 'flux-kontext' && imageCount === 0) {
      throw createApiServiceError(
        'FLUX Kontext requires at least one source or reference image.'
      );
    }
    if (
      ['ideogram-v3-turbo', 'ideogram-v3-quality', 'qwen-image', 'recraft-v3'].includes(
        ctx.input.modelId
      ) &&
      imageCount > 0
    ) {
      throw createApiServiceError(
        'This model supports text-to-image generation only. Choose an editing-capable model or omit the source and reference images.'
      );
    }
    if (
      ['gpt-image-1-mini', 'gpt-image-2-low', 'gpt-image-2-med', 'gpt-image-2-high'].includes(
        ctx.input.modelId
      ) &&
      ctx.input.ratio !== undefined &&
      !['1:1', '3:2', '2:3'].includes(ctx.input.ratio)
    ) {
      throw createApiServiceError(
        'GPT Image models support the aspect ratios 1:1, 3:2, and 2:3.'
      );
    }
    let client = new Client({ token: ctx.auth.token });
    let job = await client.startAiGeneration(ctx.input);
    return {
      output: { ...job, raw: job },
      message: `AI generation job **${job.jobUid}** is **${job.status}**.`
    };
  })
  .build();

export let getAiGeneration = SlateTool.create(spec, {
  name: 'Get AI Image Generation',
  key: 'get_ai_generation',
  description:
    'Check an AI image generation job and retrieve its image when complete. Failed jobs return the provider error message.',
  instructions: [
    'Poll about every two seconds. Stop polling when status is done or error. Save completed images promptly because hosted URLs are not guaranteed to remain available.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({ jobUid: z.string().describe('Job identifier returned by start_ai_generation') })
  )
  .output(jobSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let job = await client.getAiGeneration(ctx.input.jobUid);
    if (job.status === 'done' && job.resultUrl) {
      await ctx.addAttachment({
        type: 'url',
        url: job.resultUrl,
        headers: getFileAuthHeaders(job.resultUrl, ctx.auth.token)
      });
    }
    return {
      output: { ...job, raw: job },
      message: `AI generation job **${job.jobUid}** is **${job.status}**${job.error ? `: ${job.error}` : '.'}`
    };
  })
  .build();
