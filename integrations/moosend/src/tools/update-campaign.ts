import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { MoosendClient } from '../lib/client';
import { email, text } from '../lib/data';
import { spec } from '../spec';

export let updateCampaign = SlateTool.create(spec, {
  name: 'Update Campaign',
  key: 'update_campaign',
  description: `Update the name, subject, sender, reply-to address or content of an existing draft campaign. Existing recipient lists and segments are preserved.`,
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
      htmlContent: z
        .string()
        .optional()
        .describe('Complete HTML content; omitted content is preserved by a pre-read'),
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

    if (ctx.input.htmlContent && ctx.input.webLocation)
      throw createApiServiceError('Provide only one content source.');
    let body: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) body.Name = text(ctx.input.name, 'campaign name');
    if (ctx.input.subject !== undefined) body.Subject = text(ctx.input.subject, 'subject');
    if (ctx.input.senderEmail !== undefined) body.SenderEmail = email(ctx.input.senderEmail);
    if (ctx.input.replyToEmail !== undefined)
      body.ReplyToEmail = email(ctx.input.replyToEmail);
    if (ctx.input.webLocation !== undefined)
      body.WebLocation = text(ctx.input.webLocation, 'content URL');
    if (ctx.input.htmlContent !== undefined)
      body.HTMLContent = text(ctx.input.htmlContent, 'HTML content');
    if (ctx.input.confirmationToEmail)
      body.ConfirmationToEmail = email(ctx.input.confirmationToEmail, 'confirmation email');

    if (!Object.keys(body).length)
      throw createApiServiceError('Provide at least one campaign property to update.');
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
