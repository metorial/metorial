import { SlateTool } from 'slates';
import { z } from 'zod';
import { FalClient } from '../lib/client';
import { spec } from '../spec';

export let runModel = SlateTool.create(spec, {
  name: 'Run Model',
  key: 'run_model',
  description: `Run synchronous inference on any Fal.ai model endpoint with arbitrary input parameters.
This is a generic tool for calling any model that doesn't have a dedicated tool, including 3D generation, image editing, upscaling, and other specialized models.
Pass model-specific parameters directly and receive the raw model output.`,
  instructions: [
    'Use this tool when the dedicated image/video/audio tools do not cover your use case.',
    'Consult the Search Models tool to discover available model endpoints and their parameters.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
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
      result: z.any().describe('Raw model output, structure varies by model')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FalClient(ctx.auth.token);

    ctx.progress(`Running ${ctx.input.modelId}...`);
    let result = await client.runModel(ctx.input.modelId, ctx.input.modelInput);

    return {
      output: {
        result
      },
      message: `Ran inference on **${ctx.input.modelId}** successfully.`
    };
  })
  .build();
