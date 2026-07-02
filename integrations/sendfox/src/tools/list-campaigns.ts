import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `Retrieve a paginated list of email campaigns with basic performance stats.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (default: 1)')
    })
  )
  .output(
    z.object({
      campaigns: z.array(
        z.object({
          campaignId: z.number().describe('Campaign ID'),
          title: z.string().describe('Campaign title'),
          subject: z.string().describe('Email subject line'),
          fromName: z.string().describe('Sender name'),
          fromEmail: z.string().describe('Sender email'),
          scheduledAt: z.string().nullable().describe('Scheduled send time'),
          sentAt: z.string().nullable().describe('Actual send time'),
          sentCount: z.number().describe('Number of emails sent'),
          uniqueOpenCount: z.number().describe('Unique opens'),
          uniqueClickCount: z.number().describe('Unique clicks'),
          createdAt: z.string().describe('Creation timestamp')
        })
      ),
      currentPage: z.number().describe('Current page number'),
      lastPage: z.number().describe('Last page number'),
      total: z.number().describe('Total number of campaigns')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listCampaigns(ctx.input.page);

    return {
      output: {
        campaigns: result.data.map(c => ({
          campaignId: c.id,
          title: c.title,
          subject: c.subject,
          fromName: c.from_name,
          fromEmail: c.from_email,
          scheduledAt: c.scheduled_at,
          sentAt: c.sent_at,
          sentCount: c.sent_count,
          uniqueOpenCount: c.unique_open_count,
          uniqueClickCount: c.unique_click_count,
          createdAt: c.created_at
        })),
        currentPage: result.current_page,
        lastPage: result.last_page,
        total: result.total
      },
      message: `Retrieved ${result.data.length} campaigns (page ${result.current_page} of ${result.last_page}, ${result.total} total).`
    };
  })
  .build();
