import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCampaign = SlateTool.create(spec, {
  name: 'Update Campaign',
  key: 'update_campaign',
  description: `Update an existing email campaign's properties such as name, subject, content, sender details, or associated contact lists. Only provided fields will be updated.`
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign to update'),
      name: z.string().optional().describe('New campaign name'),
      subject: z.string().optional().describe('New email subject line'),
      fromName: z.string().optional().describe('New sender display name'),
      fromEmail: z.string().optional().describe('New sender email address'),
      replyEmail: z.string().optional().describe('New reply-to email address'),
      htmlContent: z.string().optional().describe('New HTML content'),
      textContent: z.string().optional().describe('New plain text content'),
      previewText: z.string().optional().describe('New inbox preview text'),
      contactListIds: z
        .array(z.string())
        .optional()
        .describe('Updated list of contact list IDs')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, any> = {};
    if (ctx.input.name) data.Name = ctx.input.name;
    if (ctx.input.subject) data.Subject = ctx.input.subject;
    if (ctx.input.fromName) data.FromName = ctx.input.fromName;
    if (ctx.input.fromEmail) data.FromEmail = ctx.input.fromEmail;
    if (ctx.input.replyEmail) data.ReplyEmail = ctx.input.replyEmail;
    if (ctx.input.htmlContent) data.TemplateContent = ctx.input.htmlContent;
    if (ctx.input.textContent) data.TemplateText = ctx.input.textContent;
    if (ctx.input.previewText) data.InboxPreviewText = ctx.input.previewText;
    if (ctx.input.contactListIds) {
      data.ContactLists = ctx.input.contactListIds.map(id => ({ ID: id }));
    }

    let result = await client.updateCampaign(ctx.input.campaignId, data);
    let success = result?.Status === 1;

    return {
      output: { success },
      message: success
        ? `Successfully updated campaign \`${ctx.input.campaignId}\`.`
        : `Failed to update campaign \`${ctx.input.campaignId}\`.`
    };
  })
  .build();
