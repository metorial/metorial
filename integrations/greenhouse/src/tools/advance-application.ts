import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { spec } from '../spec';
export const advanceApplicationTool = SlateTool.create(spec, {
  key: 'advance_application',
  name: 'Advance or Move Application',
  description:
    'Advance automatically or move to a chosen job interview stage. Stage transition rules can send automated emails and retain history. Read get_application and get_job with includeStages before moving.',
  tags: { readOnly: false, destructive: true }
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
      action: z.string(),
      currentStageId: z.string()
    })
  )
  .handleInvocation(async ctx => {
    return {
      output: await new GreenhouseClient(ctx.auth, ctx.config).advanceApplication(
        ctx.input.applicationId,
        ctx.input
      ),
      message:
        'Confirmed the application stage change. Configured transition rules may have run.'
    };
  })
  .build();
