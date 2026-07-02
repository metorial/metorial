import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEmails = SlateTool.create(spec, {
  name: 'List Emails',
  key: 'list_emails',
  description: `Retrieve all email campaigns visible to the authenticated user, including status, send count, open/response rates, and preview URLs.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      emails: z.array(
        z.object({
          emailId: z.string().describe('Unique identifier for the email'),
          name: z.string().describe('Email name/subject'),
          scheduledDate: z
            .string()
            .nullable()
            .describe('Scheduled send date, null if not scheduled'),
          sendNow: z.string().describe('Whether the email was sent immediately (0 or 1)'),
          sendCount: z.string().describe('Number of recipients'),
          campaignTitle: z.string().nullable().describe('Associated campaign title'),
          status: z.string().describe('Email status (e.g. delivered, incomplete)'),
          uniqueViews: z.number().describe('Number of unique opens'),
          uniqueResponses: z.number().describe('Number of unique clicks/responses'),
          percentViews: z.number().describe('Open rate percentage'),
          percentResponses: z.number().describe('Response rate percentage'),
          previewUrl: z.string().describe('URL to preview the email'),
          previewThumb: z.string().describe('Thumbnail preview URL')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let emails = await client.getEmails();

    let mapped = emails.map(e => ({
      emailId: e.id,
      name: e.name,
      scheduledDate: e.scheduled_date,
      sendNow: e.send_now,
      sendCount: e.send_count,
      campaignTitle: e.campaign_title,
      status: e.status,
      uniqueViews: e.unique_views,
      uniqueResponses: e.unique_responses,
      percentViews: e.percent_views,
      percentResponses: e.percent_responses,
      previewUrl: e.preview_url,
      previewThumb: e.preview_thumb
    }));

    return {
      output: { emails: mapped },
      message: `Found **${mapped.length}** email campaign(s).`
    };
  })
  .build();
