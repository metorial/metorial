import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let trainModelTool = SlateTool.create(spec, {
  name: 'Train Model',
  key: 'train_model',
  description: `Start training a model on a specific dataset version using Roboflow Train. Training runs asynchronously and typically completes within 24 hours. Once done, the model is automatically deployed to a hosted inference API. Use **Get Version** to monitor training progress and results.`,
  instructions: [
    'The dataset version must already be generated before training.',
    'Training is asynchronous - this returns immediately after starting.'
  ]
})
  .input(
    z.object({
      projectId: z.string().describe('Project URL slug'),
      versionNumber: z.number().describe('Version number to train on'),
      speed: z
        .enum(['fast', 'accurate'])
        .optional()
        .describe('Training speed preset. "accurate" may require a paid plan.'),
      modelType: z
        .string()
        .optional()
        .describe(
          'Specific model architecture (e.g., "rfdetr-nano"). Overrides speed if provided.'
        ),
      epochs: z.number().optional().describe('Number of training epochs'),
      checkpoint: z.string().optional().describe('Checkpoint to resume training from')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Training status')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let workspaceId = await client.getWorkspaceId();

    let result = await client.trainModel(
      workspaceId,
      ctx.input.projectId,
      ctx.input.versionNumber,
      {
        speed: ctx.input.speed,
        modelType: ctx.input.modelType,
        epochs: ctx.input.epochs,
        checkpoint: ctx.input.checkpoint
      }
    );

    return {
      output: {
        status: result.status || 'training'
      },
      message: `Started training model on **${ctx.input.projectId}** version **${ctx.input.versionNumber}**. Use Get Version to monitor training progress.`
    };
  })
  .build();
