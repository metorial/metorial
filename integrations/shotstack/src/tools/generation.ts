import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { EditClient } from '../lib/client';
import { attachTemporaryOutput } from '../lib/files';
import { spec } from '../spec';

let generationInput = z.object({
  asset: z.object({
    type: z.enum(['image', 'video', 'audio']).describe('Type of media to generate'),
    prompt: z
      .string()
      .optional()
      .describe('Prompt or spoken text, when required by the selected model'),
    src: z
      .string()
      .optional()
      .describe('Public HTTPS source file URL, for models that require one'),
    model: z
      .string()
      .optional()
      .describe('Model ID from list_generation_models; omit to use the provider default'),
    options: z
      .record(z.string(), z.any())
      .optional()
      .describe('Model settings from get_generation_model')
  }),
  length: z
    .number()
    .optional()
    .describe('Positive clip length in seconds for duration-based models')
});
let generationOutput = z.object({
  generationId: z.string().describe('Generation job ID'),
  status: z.enum(['queued', 'processing', 'done', 'failed']).describe('Generation job status'),
  url: z.string().optional().describe('Provider output URL when complete'),
  error: z.string().optional().describe('Provider error details for a failed generation'),
  deliveryWarning: z
    .string()
    .optional()
    .describe('Warning if downloadable media could not be prepared'),
  raw: z.record(z.string(), z.any()).describe('Original generation response')
});
let modelOutput = z.object({
  model: z.string(),
  type: z.enum(['image', 'video', 'audio']),
  name: z.string().optional(),
  description: z.string().optional(),
  options: z.record(z.string(), z.any()).optional().describe('JSON Schema for model options'),
  available: z
    .boolean()
    .optional()
    .describe('Whether this account can use the model; omission means unknown'),
  unavailableReason: z.string().optional()
});
let validateInput = (input: z.infer<typeof generationInput>) => {
  if (input.length !== undefined && (!Number.isFinite(input.length) || input.length <= 0))
    throw createApiServiceError('length must be a positive number of seconds.');
  if (
    input.asset.prompt !== undefined &&
    (!input.asset.prompt.trim() || input.asset.prompt.length > 4000)
  )
    throw createApiServiceError(
      'prompt must contain between 1 and 4,000 characters, including non-whitespace text.'
    );
  if (input.asset.src !== undefined) {
    let source: URL;
    try {
      source = new URL(input.asset.src);
    } catch {
      throw createApiServiceError('src must be a public HTTPS URL.');
    }
    if (source.protocol !== 'https:' || source.username || source.password)
      throw createApiServiceError(
        'src must be a public HTTPS URL without embedded credentials.'
      );
  }
  if (input.asset.prompt === undefined && input.asset.src === undefined)
    throw createApiServiceError(
      'Provide a prompt or a source file URL for the selected model.'
    );
};
let model = (value: unknown) => {
  let parsed = modelOutput.safeParse(value);
  if (!parsed.success)
    throw createApiServiceError('Shotstack returned an invalid generation model.');
  return parsed.data;
};
let result = async (
  ctx: Parameters<typeof attachTemporaryOutput>[0],
  raw: Record<string, any>
) => {
  let output = {
    generationId: raw.id,
    status: raw.status,
    url: raw.url,
    error: raw.error,
    deliveryWarning: undefined as string | undefined,
    raw
  };
  if (!generationOutput.safeParse(output).success)
    throw createApiServiceError('Shotstack returned an invalid generation response.');
  if (raw.status === 'done')
    output.deliveryWarning =
      raw.url === undefined
        ? 'Shotstack reports the job complete but did not return its file URL. Retrieve the job again to check file availability.'
        : await attachTemporaryOutput(ctx, raw.url);
  return {
    output,
    message: `Generation **${raw.id}** is **${raw.status}**.${output.deliveryWarning ? ` ${output.deliveryWarning}` : ''}`
  };
};

export let generateTool = SlateTool.create(spec, {
  name: 'Generate Media',
  key: 'generate_media',
  description:
    'Generate a single image, video, or audio asset with the current Edit API. Discover models and their options first, then request quote_generation before submitting paid work.',
  instructions: [
    'Identical assets are cached by Shotstack. Use a stable idempotencyKey to retry one submission; a new key creates a separate generation that can incur charges.'
  ],
  tags: { readOnly: false }
})
  .input(
    generationInput.extend({
      idempotencyKey: z
        .string()
        .optional()
        .describe('Stable key for safely retrying this generation request')
    })
  )
  .output(generationOutput)
  .handleInvocation(async ctx => {
    validateInput(ctx.input);
    if (ctx.input.idempotencyKey !== undefined && !ctx.input.idempotencyKey.trim())
      throw createApiServiceError('idempotencyKey must not be blank.');
    let client = new EditClient(ctx.auth.token, ctx.config.environment);
    return result(
      ctx,
      await client.generate(
        { asset: ctx.input.asset, length: ctx.input.length },
        ctx.input.idempotencyKey
      )
    );
  })
  .build();

export let getGenerationTool = SlateTool.create(spec, {
  name: 'Get Generation',
  key: 'get_generation',
  description:
    'Check an Edit API generation job and prepare its completed media for download. This only retrieves an existing job.',
  tags: { readOnly: true }
})
  .input(z.object({ generationId: z.string().describe('Job ID returned by generate_media') }))
  .output(generationOutput)
  .handleInvocation(async ctx => {
    let client = new EditClient(ctx.auth.token, ctx.config.environment);
    return result(ctx, await client.getGeneration(ctx.input.generationId));
  })
  .build();

export let quoteGenerationTool = SlateTool.create(spec, {
  name: 'Quote Generation',
  key: 'quote_generation',
  description:
    'Estimate the credits for a media generation without creating a job or reserving credits. The price can change before submission.',
  tags: { readOnly: true }
})
  .input(generationInput)
  .output(
    z.object({
      credits: z.number().describe('Estimated generation credits'),
      ceiling: z
        .boolean()
        .describe('Whether the estimate uses a duration reservation allowance')
    })
  )
  .handleInvocation(async ctx => {
    validateInput(ctx.input);
    let client = new EditClient(ctx.auth.token, ctx.config.environment);
    let quote = await client.quoteGeneration(ctx.input);
    return {
      output: { credits: quote.credits, ceiling: quote.ceiling },
      message: `Estimated generation cost: **${quote.credits}** credits.`
    };
  })
  .build();

export let listGenerationModelsTool = SlateTool.create(spec, {
  name: 'List Generation Models',
  key: 'list_generation_models',
  description:
    'Discover current generation model IDs, media types, account availability, and optionally option schemas.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      expandOptions: z.boolean().optional().describe("Include each model's option schema")
    })
  )
  .output(z.object({ models: z.array(modelOutput) }))
  .handleInvocation(async ctx => {
    let client = new EditClient(ctx.auth.token, ctx.config.environment);
    let response = await client.listModels(ctx.input.expandOptions);
    let models = response.models.map(model);
    return { output: { models }, message: `Found **${models.length}** generation models.` };
  })
  .build();

export let getGenerationModelTool = SlateTool.create(spec, {
  name: 'Get Generation Model',
  key: 'get_generation_model',
  description:
    'Get a model from list_generation_models, including its accepted settings as a JSON Schema.',
  tags: { readOnly: true }
})
  .input(z.object({ modelId: z.string().describe('Model ID from list_generation_models') }))
  .output(modelOutput)
  .handleInvocation(async ctx => {
    let client = new EditClient(ctx.auth.token, ctx.config.environment);
    let output = model(await client.getModel(ctx.input.modelId));
    return { output, message: `Retrieved generation model **${output.model}**.` };
  })
  .build();
