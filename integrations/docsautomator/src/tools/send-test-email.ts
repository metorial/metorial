import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendTestEmail = SlateTool.create(spec, {
  name: 'Send Test Email',
  key: 'send_test_email',
  description:
    "Sends a test email using an automation's configured email settings so you can check delivery before generating documents. Call list_automations to find the automation ID.",
  constraints: ['Limited to 25 test emails per hour per automation.'],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      automationId: z.string().min(1).describe('Automation ID from list_automations.'),
      recipient: z.email().describe('Email address that should receive the test email.')
    })
  )
  .output(
    z.object({
      success: z
        .boolean()
        .describe('Whether DocsAutomator confirmed the test email was sent.'),
      message: z.string().optional().describe('Delivery confirmation from DocsAutomator.'),
      remaining: z
        .number()
        .optional()
        .describe('Test emails remaining in the current rate-limit window.'),
      resetAt: z.string().optional().describe('When the test-email rate limit resets.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.sendTestEmail(ctx.input.automationId, ctx.input.recipient);
    if (result.success !== true) {
      throw createApiServiceError(
        result.message ||
          "DocsAutomator did not confirm sending the test email. Check the automation's email settings before retrying."
      );
    }
    return {
      output: {
        success: result.success,
        message: result.message,
        remaining: result.rateLimit?.remaining,
        resetAt: result.rateLimit?.resetAt
      },
      message: `Sent a test email for automation **${ctx.input.automationId}** to **${ctx.input.recipient}**.`
    };
  })
  .build();
