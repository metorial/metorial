import { SlateTool } from 'slates';
import { z } from 'zod';
import { KaggleClient } from '../lib/client';
import { spec } from '../spec';

let modelInstanceSchema = z
  .object({
    framework: z.string().optional().describe('Framework (e.g., tensorflow, pytorch)'),
    overview: z.string().optional().describe('Variation overview'),
    slug: z.string().optional().describe('Variation slug'),
    licenseName: z.string().optional().describe('License name'),
    fineTunable: z.boolean().optional().describe('Whether the model is fine-tunable'),
    versionNumber: z.number().optional().describe('Current version number'),
    modelInstanceType: z.string().optional().describe('Instance type'),
    trainingData: z.array(z.string()).optional().describe('Training data sources')
  })
  .passthrough();

export let getModelDetails = SlateTool.create(spec, {
  name: 'Get Model Details',
  key: 'get_model_details',
  description: `Retrieve detailed information about a Kaggle model and optionally a specific variation. Provide the model reference as "owner/model-slug" and optionally a framework and variation slug to get a specific instance.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ownerSlug: z.string().describe('Model owner username'),
      modelSlug: z.string().describe('Model slug/name'),
      framework: z
        .string()
        .optional()
        .describe(
          'Framework of a specific variation to retrieve (e.g., "tensorflow", "pytorch")'
        ),
      variationSlug: z
        .string()
        .optional()
        .describe('Variation slug to retrieve a specific instance')
    })
  )
  .output(
    z
      .object({
        title: z.string().optional().describe('Model title'),
        subtitle: z.string().optional().describe('Model subtitle'),
        author: z.string().optional().describe('Model author'),
        description: z.string().optional().describe('Model description'),
        url: z.string().optional().describe('Model URL'),
        isPrivate: z.boolean().optional().describe('Whether the model is private'),
        instances: z
          .array(modelInstanceSchema)
          .optional()
          .describe('Model variations/instances'),
        variationDetail: z
          .record(z.string(), z.any())
          .optional()
          .describe('Detailed info for a specific variation if requested')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new KaggleClient(ctx.auth);
    let model = await client.getModel(ctx.input.ownerSlug, ctx.input.modelSlug);

    let variationDetail: any;
    if (ctx.input.framework && ctx.input.variationSlug) {
      variationDetail = await client
        .getModelInstance(
          ctx.input.ownerSlug,
          ctx.input.modelSlug,
          ctx.input.framework,
          ctx.input.variationSlug
        )
        .catch(() => null);
    }

    return {
      output: {
        ...(model ?? {}),
        variationDetail: variationDetail ?? undefined
      },
      message: `Retrieved model **${ctx.input.ownerSlug}/${ctx.input.modelSlug}**${variationDetail ? ` with variation ${ctx.input.framework}/${ctx.input.variationSlug}` : ''}.`
    };
  })
  .build();
