import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCampaign = SlateTool.create(spec, {
  name: 'Create Campaign',
  key: 'create_campaign',
  description: `Create a new email campaign in draft status. Configure the campaign name, subject, sender, content, and target contact lists. The campaign will need to be scheduled or sent separately.`,
  instructions: [
    'Provide HTML content via `htmlContent` for rich emails, or `textContent` for plain-text emails.',
    'Associate the campaign with one or more contact lists using `contactListIds`.'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Campaign name (internal identifier)'),
      subject: z.string().describe('Email subject line'),
      fromName: z.string().describe('Sender display name'),
      fromEmail: z.string().describe('Sender email address (must be verified)'),
      replyEmail: z.string().optional().describe('Reply-to email address'),
      htmlContent: z.string().optional().describe('HTML content of the email body'),
      textContent: z.string().optional().describe('Plain text version of the email'),
      previewText: z.string().optional().describe('Inbox preview text snippet'),
      contactListIds: z
        .array(z.string())
        .optional()
        .describe('IDs of contact lists to send to'),
      webpageVersion: z.boolean().optional().describe('Whether to include a web version link')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('ID of the newly created campaign')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let contactLists = (ctx.input.contactListIds ?? []).map(id => ({
      ID: id
    }));

    let data: Record<string, any> = {
      Name: ctx.input.name,
      Subject: ctx.input.subject,
      FromName: ctx.input.fromName,
      FromEmail: ctx.input.fromEmail
    };

    if (ctx.input.replyEmail) data.ReplyEmail = ctx.input.replyEmail;
    if (ctx.input.htmlContent) data.TemplateContent = ctx.input.htmlContent;
    if (ctx.input.textContent) data.TemplateText = ctx.input.textContent;
    if (ctx.input.previewText) data.InboxPreviewText = ctx.input.previewText;
    if (contactLists.length > 0) data.ContactLists = contactLists;
    if (ctx.input.webpageVersion !== undefined)
      data.HasWebpageVersion = ctx.input.webpageVersion ? '1' : '0';

    let result = await client.createCampaign(data);
    let campaignId = String(result?.Data ?? '');

    return {
      output: { campaignId },
      message: `Created campaign **"${ctx.input.name}"** with ID \`${campaignId}\`.`
    };
  })
  .build();
