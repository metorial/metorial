import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { MailchimpClient } from '../lib/client';
import { spec } from '../spec';

export let listCampaignsTool = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `Retrieve campaigns from the Mailchimp account. Filter by status or type. Returns campaign IDs, titles, subjects, status, send time, and recipient list info.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      count: z.number().optional().describe('Number of campaigns to return (default 100)'),
      offset: z.number().optional().describe('Number of campaigns to skip'),
      status: z
        .enum(['save', 'paused', 'schedule', 'sending', 'sent'])
        .optional()
        .describe('Filter by campaign status'),
      type: z
        .enum(['regular', 'plaintext', 'rss', 'variate'])
        .optional()
        .describe('Filter by campaign type'),
      sinceCreateTime: z
        .string()
        .optional()
        .describe('Filter campaigns created after this ISO 8601 date'),
      sinceSendTime: z
        .string()
        .optional()
        .describe('Filter campaigns sent after this ISO 8601 date')
    })
  )
  .output(
    z.object({
      campaigns: z.array(
        z.object({
          campaignId: z.string(),
          type: z.string(),
          status: z.string(),
          title: z.string().optional(),
          subjectLine: z.string().optional(),
          previewText: z.string().optional(),
          listId: z.string().optional(),
          listName: z.string().optional(),
          fromName: z.string().optional(),
          replyTo: z.string().optional(),
          createTime: z.string(),
          sendTime: z.string().optional(),
          emailsSent: z.number()
        })
      ),
      totalItems: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailchimpClient({
      token: ctx.auth.token,
      serverPrefix: ctx.auth.serverPrefix
    });

    let result = await client.getCampaigns({
      count: ctx.input.count,
      offset: ctx.input.offset,
      status: ctx.input.status,
      type: ctx.input.type,
      sinceCreateTime: ctx.input.sinceCreateTime,
      sinceSendTime: ctx.input.sinceSendTime
    });

    let campaigns = (result.campaigns ?? []).map((c: any) => ({
      campaignId: c.id,
      type: c.type,
      status: c.status,
      title: c.settings?.title,
      subjectLine: c.settings?.subject_line,
      previewText: c.settings?.preview_text,
      listId: c.recipients?.list_id,
      listName: c.recipients?.list_name,
      fromName: c.settings?.from_name,
      replyTo: c.settings?.reply_to,
      createTime: c.create_time,
      sendTime: c.send_time || undefined,
      emailsSent: c.emails_sent ?? 0
    }));

    return {
      output: {
        campaigns,
        totalItems: result.total_items ?? 0
      },
      message: `Found **${campaigns.length}** campaign(s) out of ${result.total_items ?? 0} total.`
    };
  })
  .build();
