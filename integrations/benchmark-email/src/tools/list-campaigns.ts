import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let campaignSchema = z.object({
  campaignId: z.string().describe('Unique ID of the campaign'),
  name: z.string().describe('Campaign name'),
  subject: z.string().describe('Email subject line'),
  fromName: z.string().describe('Sender display name'),
  fromEmail: z.string().describe('Sender email address'),
  replyEmail: z.string().describe('Reply-to email address'),
  status: z.string().describe('Campaign status'),
  createdDate: z.string().describe('Date the campaign was created'),
  modifiedDate: z.string().describe('Date the campaign was last modified'),
  scheduleDate: z.string().describe('Scheduled send date')
});

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `List and search email campaigns in your Benchmark Email account. Filter by name or status to find specific campaigns. Returns campaign metadata including status, schedule, and sender information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search campaigns by name'),
      status: z
        .enum(['draft', 'scheduled', 'sent', 'sending', 'archive'])
        .optional()
        .describe('Filter by campaign status'),
      pageNumber: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z.number().optional().describe('Number of results per page (default 50)')
    })
  )
  .output(
    z.object({
      campaigns: z.array(campaignSchema).describe('List of campaigns'),
      totalCount: z.number().describe('Total number of matching campaigns')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let statusMap: Record<string, string> = {
      draft: '0',
      scheduled: '4',
      sent: '1',
      sending: '5',
      archive: '-1'
    };

    let result = await client.listCampaigns({
      filter: ctx.input.search,
      status: ctx.input.status ? statusMap[ctx.input.status] : undefined,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let campaigns = (result?.Data ?? []).map((c: any) => ({
      campaignId: String(c.ID ?? ''),
      name: String(c.Name ?? ''),
      subject: String(c.Subject ?? ''),
      fromName: String(c.FromName ?? ''),
      fromEmail: String(c.FromEmail ?? ''),
      replyEmail: String(c.ReplyEmail ?? ''),
      status: String(c.StatusText ?? c.Status ?? ''),
      createdDate: String(c.CreatedDate ?? ''),
      modifiedDate: String(c.ModifiedDate ?? ''),
      scheduleDate: String(c.ScheduleDate ?? '')
    }));

    return {
      output: {
        campaigns,
        totalCount: Number(result?.Count ?? campaigns.length)
      },
      message: `Found **${campaigns.length}** campaign(s)${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}${ctx.input.status ? ` with status "${ctx.input.status}"` : ''}.`
    };
  })
  .build();
