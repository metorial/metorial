import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { projectIdSchema, versionNumberSchema } from '../lib/schemas';
import { spec } from '../spec';

export let stopTrainingTool = SlateTool.create(spec, {
  name: 'Stop Training',
  key: 'stop_training',
  description: `End a model training job on a dataset version before it finishes. Use **stop** to finish early and keep the current model weights, or **cancel** to discard the weights (credits may be refunded if canceled early). Use **Get Version** to confirm the resulting training status.`,
  instructions: [
    'mode "stop" is cooperative and idempotent: the job saves its weights at the end of the current epoch and the model can take several minutes to appear.',
    'mode "cancel" discards the model and fails if the job already finished or was canceled.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: projectIdSchema,
      versionNumber: versionNumberSchema,
      mode: z
        .enum(['stop', 'cancel'])
        .describe(
          '"stop" ends training early and keeps the model weights; "cancel" ends training and discards them'
        )
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Project slug or workspace/project ID'),
      versionNumber: z.number().describe('Dataset version whose training was ended'),
      mode: z.enum(['stop', 'cancel']).describe('Requested action'),
      success: z.boolean().describe('Whether Roboflow accepted the request')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let workspaceId = await client.getWorkspaceId();

    let result = await client.endTraining(
      workspaceId,
      ctx.input.projectId,
      ctx.input.versionNumber,
      ctx.input.mode
    );

    if (result && typeof result === 'object' && result.success !== true) {
      throw createApiServiceError(
        `Roboflow did not confirm the training ${ctx.input.mode} request. Check get_version for the current training status.`
      );
    }

    return {
      output: {
        projectId: ctx.input.projectId,
        versionNumber: ctx.input.versionNumber,
        mode: ctx.input.mode,
        success: true
      },
      message:
        ctx.input.mode === 'stop'
          ? `Requested an early stop for training on **${ctx.input.projectId}** version **${ctx.input.versionNumber}**. The model weights are kept.`
          : `Canceled training on **${ctx.input.projectId}** version **${ctx.input.versionNumber}**. The model weights are discarded.`
    };
  })
  .build();
