import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendCampaign = SlateTool.create(spec, {
  name: 'Send Campaign',
  key: 'send_campaign',
  description: `Send a campaign to its full subscriber list, or send a test email to preview the campaign first. Use action "send" to dispatch to all subscribers, or "send_test" to send a preview to specific email addresses.`,
  instructions: [
    'A campaign must be in draft status before it can be sent.',
    'Test emails can be sent to up to 10 comma-delimited email addresses.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['send', 'send_test'])
        .describe('Whether to send the campaign or send a test email'),
      campaignUuid: z.string().describe('UUID of the campaign to send'),
      testEmail: z
        .string()
        .optional()
        .describe(
          'Email address(es) for test send (comma-separated, up to 10). Required for send_test action.'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the send was initiated successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    if (ctx.input.action === 'send_test') {
      if (!ctx.input.testEmail) throw new Error('testEmail is required for send_test action');
      await client.sendCampaignTest(ctx.input.campaignUuid, ctx.input.testEmail);
      return {
        output: { success: true },
        message: `Test email for campaign **${ctx.input.campaignUuid}** sent to **${ctx.input.testEmail}**.`
      };
    }

    await client.sendCampaign(ctx.input.campaignUuid);
    return {
      output: { success: true },
      message: `Campaign **${ctx.input.campaignUuid}** is now being sent.`
    };
  });
