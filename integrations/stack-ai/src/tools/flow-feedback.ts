import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { orgIdInput } from '../lib/deployment';
import { spec } from '../spec';

export let flowFeedback = SlateTool.create(spec, {
  name: 'Submit Flow Feedback',
  key: 'flow_feedback',
  description: `Submit feedback for a specific flow run. Use this to provide human feedback on AI-generated outputs, useful for evaluation and fine-tuning workflows.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      orgId: orgIdInput,
      flowId: z.string().describe('The ID of the flow the run belongs to'),
      runId: z.string().describe('The ID of the specific run to provide feedback for'),
      feedback: z.string().describe('The feedback text for the run')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the feedback was submitted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx, ctx.input.orgId);

    await client.giveFeedback(ctx.input.flowId, ctx.input.runId, ctx.input.feedback);

    return {
      output: {
        success: true
      },
      message: `Feedback submitted for run **${ctx.input.runId}** on flow **${ctx.input.flowId}**.`
    };
  })
  .build();
