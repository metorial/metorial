import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let configureAutoFeedback = SlateTool.create(spec, {
  name: 'Configure Auto Feedback',
  key: 'configure_auto_feedback',
  description: `Configure automatic feedback request settings for a business. Enable or disable automatic mode and set the number of feedback requests sent per day.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      businessId: z.number().describe('Business ID to configure'),
      enabled: z
        .boolean()
        .describe('Enable (true) or disable (false) automatic feedback requests'),
      requestsPerDay: z
        .number()
        .optional()
        .describe('Number of feedback requests to send per day in automatic mode')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the configuration was applied')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.configureAutoFeedback({
      businessId: ctx.input.businessId,
      autoFeedback: ctx.input.enabled ? 1 : 0,
      autoSend: ctx.input.requestsPerDay
    });

    if (data.errorCode !== 0) {
      throw new Error(
        `Failed to configure auto feedback: ${data.errorMessage} (code: ${data.errorCode})`
      );
    }

    return {
      output: { success: true },
      message: `Auto feedback for business **${ctx.input.businessId}** ${ctx.input.enabled ? `enabled (${ctx.input.requestsPerDay ?? 'default'} per day)` : 'disabled'}.`
    };
  })
  .build();
