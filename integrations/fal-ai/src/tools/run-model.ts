import { SlateTool } from 'slates';
import { z } from 'zod';
import { FalClient } from '../lib/client';
import { addModelFiles } from '../lib/files';
import { spec } from '../spec';

export let runModel = SlateTool.create(spec, {
  name: 'Run Model',
  key: 'run_model',
  description: `Run synchronous inference on any Fal.ai model endpoint with arbitrary input parameters.
This is a generic tool for calling any model that doesn't have a dedicated tool, including 3D generation, image editing, upscaling, and other specialized models.
Pass model-specific parameters directly and receive model output with downloadable files when produced.`,
  instructions: [
    'Use this tool when the dedicated image/video/audio tools do not cover your use case.',
    'Use search_models with includeSchema=true to discover model endpoints and their input/output schemas.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      fileRetentionSeconds: z
        .number()
        .int()
        .min(60)
        .max(31536000)
        .optional()
        .describe(
          'Generated file lifetime in seconds. Omit to use account defaults; expired files cannot be recovered'
        ),
      modelId: z
        .string()
        .describe('Model endpoint ID, e.g. "fal-ai/triposr", "fal-ai/esrgan"'),
      modelInput: z
        .record(z.string(), z.any())
        .describe('Model-specific input parameters as key-value pairs')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Model output and file metadata; structure varies by model')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FalClient(ctx.auth.token);

    ctx.progress(`Running ${ctx.input.modelId}...`);
    let result = await client.runModel(ctx.input.modelId, ctx.input.modelInput, {
      fileRetentionSeconds: ctx.input.fileRetentionSeconds
    });

    const outputResult = await addModelFiles(ctx, result);

    return {
      output: {
        result: outputResult
      },
      message: `Ran inference on **${ctx.input.modelId}** successfully.`
    };
  })
  .build();
