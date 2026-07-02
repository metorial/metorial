import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { spec } from '../spec';

export let advanceApplicationTool = SlateTool.create(spec, {
  name: 'Advance or Move Application',
  key: 'advance_application',
  description: `Advance an application to the next interview stage, or move it to a specific stage. Use **advance** to progress to the next stage automatically, or **move** to jump to a specific target stage. Requires the **On-Behalf-Of** user ID in config.`,
  instructions: [
    'Use action "advance" to move to the next stage in the pipeline.',
    'Use action "move" to move to a specific stage. Provide both fromStageId and toStageId.',
    'Use the "Get Job" tool to retrieve available stages for a job if needed.'
  ],
  constraints: ['Requires the onBehalfOf config value to be set for audit purposes.'],
  tags: { readOnly: false }
})
  .input(
    z.object({
      applicationId: z.string().describe('The application ID to advance or move'),
      action: z
        .enum(['advance', 'move'])
        .describe('"advance" progresses to the next stage; "move" goes to a specific stage'),
      fromStageId: z
        .string()
        .optional()
        .describe('Current stage ID (optional for advance, required for move)'),
      toStageId: z.string().optional().describe('Target stage ID (required for move)')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      applicationId: z.string(),
      action: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GreenhouseClient({
      token: ctx.auth.token,
      onBehalfOf: ctx.config.onBehalfOf
    });
    let appId = Number.parseInt(ctx.input.applicationId, 10);

    if (ctx.input.action === 'advance') {
      await client.advanceApplication(
        appId,
        ctx.input.fromStageId ? Number.parseInt(ctx.input.fromStageId, 10) : undefined
      );
    } else {
      if (!ctx.input.fromStageId || !ctx.input.toStageId) {
        throw new Error('Both fromStageId and toStageId are required for the "move" action.');
      }
      await client.moveApplication(
        appId,
        Number.parseInt(ctx.input.fromStageId, 10),
        Number.parseInt(ctx.input.toStageId, 10)
      );
    }

    return {
      output: {
        success: true,
        applicationId: ctx.input.applicationId,
        action: ctx.input.action
      },
      message: `Application **${ctx.input.applicationId}** was ${ctx.input.action === 'advance' ? 'advanced to the next stage' : `moved to stage ${ctx.input.toStageId}`}.`
    };
  })
  .build();
