import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let campaignSchema = z.object({
  campaignUuid: z.string().describe('Unique identifier of the campaign'),
  name: z.string().describe('Campaign name'),
  status: z.string().describe('Campaign status (draft, scheduled, sending, sent)'),
  emailListUuid: z.string().nullable().describe('UUID of the associated email list'),
  fromEmail: z.string().nullable().describe('Sender email address'),
  fromName: z.string().nullable().describe('Sender name'),
  subject: z.string().nullable().describe('Email subject line'),
  scheduledAt: z.string().nullable().describe('Scheduled send time'),
  sentToNumberOfSubscribers: z
    .number()
    .nullable()
    .describe('Number of subscribers the campaign was sent to'),
  openCount: z.number().nullable().describe('Number of opens'),
  uniqueOpenCount: z.number().nullable().describe('Number of unique opens'),
  openRate: z.number().nullable().describe('Open rate percentage'),
  clickCount: z.number().nullable().describe('Number of clicks'),
  uniqueClickCount: z.number().nullable().describe('Number of unique clicks'),
  clickRate: z.number().nullable().describe('Click rate percentage'),
  unsubscribeCount: z.number().nullable().describe('Number of unsubscribes'),
  unsubscribeRate: z.number().nullable().describe('Unsubscribe rate percentage'),
  bounceCount: z.number().nullable().describe('Number of bounces'),
  bounceRate: z.number().nullable().describe('Bounce rate percentage'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp'),
  sentAt: z.string().nullable().describe('Sent timestamp')
});

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `Retrieve campaigns from Mailcoach. Supports searching by name and filtering by status (draft, scheduled, sent).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search term to filter campaigns by name'),
      status: z
        .enum(['draft', 'scheduled', 'sent'])
        .optional()
        .describe('Filter campaigns by status'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      campaigns: z.array(campaignSchema).describe('List of campaigns'),
      totalCount: z.number().describe('Total number of campaigns matching the query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    let result = await client.listCampaigns({
      search: ctx.input.search,
      status: ctx.input.status,
      page: ctx.input.page
    });

    let campaigns = (result.data || []).map((c: any) => ({
      campaignUuid: c.uuid,
      name: c.name,
      status: c.status ?? 'draft',
      emailListUuid: c.email_list_uuid ?? null,
      fromEmail: c.from_email ?? null,
      fromName: c.from_name ?? null,
      subject: c.subject ?? null,
      scheduledAt: c.scheduled_at ?? null,
      sentToNumberOfSubscribers: c.sent_to_number_of_subscribers ?? null,
      openCount: c.open_count ?? null,
      uniqueOpenCount: c.unique_open_count ?? null,
      openRate: c.open_rate ?? null,
      clickCount: c.click_count ?? null,
      uniqueClickCount: c.unique_click_count ?? null,
      clickRate: c.click_rate ?? null,
      unsubscribeCount: c.unsubscribe_count ?? null,
      unsubscribeRate: c.unsubscribe_rate ?? null,
      bounceCount: c.bounce_count ?? null,
      bounceRate: c.bounce_rate ?? null,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      sentAt: c.sent_at ?? null
    }));

    return {
      output: {
        campaigns,
        totalCount: result.meta?.total ?? campaigns.length
      },
      message: `Found **${campaigns.length}** campaign(s)${ctx.input.status ? ` with status "${ctx.input.status}"` : ''}.`
    };
  });
