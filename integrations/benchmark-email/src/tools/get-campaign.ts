import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCampaign = SlateTool.create(spec, {
  name: 'Get Campaign',
  key: 'get_campaign',
  description: `Retrieve full details of a specific email campaign by its ID, including content, sender info, schedule, and associated contact lists.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign to retrieve')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('Unique ID of the campaign'),
      name: z.string().describe('Campaign name'),
      subject: z.string().describe('Email subject line'),
      fromName: z.string().describe('Sender display name'),
      fromEmail: z.string().describe('Sender email address'),
      replyEmail: z.string().describe('Reply-to email address'),
      status: z.string().describe('Campaign status'),
      htmlContent: z.string().describe('HTML content of the email'),
      textContent: z.string().describe('Plain text content of the email'),
      previewText: z.string().describe('Inbox preview text'),
      timezone: z.string().describe('Timezone for scheduling'),
      scheduleDate: z.string().describe('Scheduled send date'),
      createdDate: z.string().describe('Date the campaign was created'),
      modifiedDate: z.string().describe('Date the campaign was last modified'),
      contactLists: z
        .array(
          z.object({
            listId: z.string().describe('Contact list ID'),
            listName: z.string().describe('Contact list name')
          })
        )
        .describe('Contact lists associated with this campaign')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getCampaign(ctx.input.campaignId);
    let c = result?.Data;

    let contactLists = (c?.ContactLists ?? []).map((l: any) => ({
      listId: String(l.ID ?? ''),
      listName: String(l.Name ?? '')
    }));

    let output = {
      campaignId: String(c?.ID ?? ''),
      name: String(c?.Name ?? ''),
      subject: String(c?.Subject ?? ''),
      fromName: String(c?.FromName ?? ''),
      fromEmail: String(c?.FromEmail ?? ''),
      replyEmail: String(c?.ReplyEmail ?? ''),
      status: String(c?.StatusText ?? c?.Status ?? ''),
      htmlContent: String(c?.TemplateContent ?? ''),
      textContent: String(c?.TemplateText ?? ''),
      previewText: String(c?.InboxPreviewText ?? ''),
      timezone: String(c?.Zone ?? ''),
      scheduleDate: String(c?.ScheduleDate ?? ''),
      createdDate: String(c?.CreatedDate ?? ''),
      modifiedDate: String(c?.ModifiedDate ?? ''),
      contactLists
    };

    return {
      output,
      message: `Retrieved campaign **"${output.name}"** (status: ${output.status}).`
    };
  })
  .build();
