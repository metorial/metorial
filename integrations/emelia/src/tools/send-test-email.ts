import { SlateTool } from 'slates';
import { z } from 'zod';
import { EmeliaClient } from '../lib/client';
import { spec } from '../spec';

export let sendTestEmail = SlateTool.create(spec, {
  name: 'Send Test Email',
  key: 'send_test_email',
  description: `Send a test email for a campaign step to preview how it will look in the recipient's inbox.`
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the email campaign'),
      email: z.string().describe('Email address to send the test to'),
      stepIndex: z.number().optional().describe('Index of the campaign step to test (0-based)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the test email was sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EmeliaClient(ctx.auth.token);
    await client.sendTestEmail(ctx.input.campaignId, {
      email: ctx.input.email,
      stepIndex: ctx.input.stepIndex
    });
    return {
      output: { success: true },
      message: `Sent test email to **${ctx.input.email}** for campaign **${ctx.input.campaignId}**.`
    };
  })
  .build();
