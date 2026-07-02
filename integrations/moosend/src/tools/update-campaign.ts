import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoosendClient } from '../lib/client';
import { spec } from '../spec';

export let updateCampaign = SlateTool.create(spec, {
  name: 'Update Campaign',
  key: 'update_campaign',
  description: `Update properties of an existing draft campaign. You can modify the name, subject, sender, content location, and A/B testing settings.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign to update'),
      name: z.string().optional().describe('New campaign name'),
      subject: z.string().optional().describe('New email subject line'),
      senderEmail: z.string().optional().describe('New sender email address'),
      replyToEmail: z.string().optional().describe('New reply-to email address'),
      webLocation: z.string().optional().describe('New URL for HTML email content'),
      confirmationToEmail: z.string().optional().describe('Email to receive send confirmation')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('ID of the updated campaign'),
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoosendClient({ token: ctx.auth.token });

    let body: Record<string, unknown> = {};
    if (ctx.input.name) body.Name = ctx.input.name;
    if (ctx.input.subject) body.Subject = ctx.input.subject;
    if (ctx.input.senderEmail) body.SenderEmail = ctx.input.senderEmail;
    if (ctx.input.replyToEmail) body.ReplyToEmail = ctx.input.replyToEmail;
    if (ctx.input.webLocation) body.WebLocation = ctx.input.webLocation;
    if (ctx.input.confirmationToEmail)
      body.ConfirmationToEmail = ctx.input.confirmationToEmail;

    await client.updateCampaign(ctx.input.campaignId, body);

    return {
      output: {
        campaignId: ctx.input.campaignId,
        success: true
      },
      message: `Updated campaign **${ctx.input.campaignId}**.`
    };
  })
  .build();
