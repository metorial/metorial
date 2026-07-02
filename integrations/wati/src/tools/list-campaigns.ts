import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let campaignSchema = z.object({
  campaignId: z.string().optional().describe('Broadcast campaign identifier.'),
  channelId: z.string().optional().describe('Associated channel identifier.'),
  name: z.string().optional().describe('Campaign name.'),
  status: z.string().optional().describe('Campaign status.'),
  templateId: z.string().optional().describe('Message template used.'),
  created: z.string().optional().describe('Creation timestamp.'),
  lastUpdated: z.string().optional().describe('Last update timestamp.'),
  scheduledAt: z.string().optional().describe('Scheduled delivery time.')
});

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `Retrieve a paginated list of broadcast campaigns. Campaigns are used to send template messages to targeted groups of contacts.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      pageNumber: z.number().int().min(1).default(1).describe('Page number (1-based).'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(50)
        .describe('Number of campaigns per page (max 100).'),
      channel: z
        .string()
        .optional()
        .describe('Filter by channel name or phone number. Omit for default channel.')
    })
  )
  .output(
    z.object({
      campaigns: z.array(campaignSchema).describe('List of broadcast campaigns.'),
      total: z.number().optional().describe('Total number of campaigns.'),
      pageNumber: z.number().optional().describe('Current page number.'),
      pageSize: z.number().optional().describe('Items per page.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiEndpoint: ctx.config.apiEndpoint
    });

    let result = await client.listCampaigns({
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize,
      channel: ctx.input.channel
    });

    let campaigns = (result?.broadcasts || []).map((b: any) => ({
      campaignId: b.id,
      channelId: b.channel_id,
      name: b.name,
      status: b.status,
      templateId: b.template_id,
      created: b.created,
      lastUpdated: b.last_updated,
      scheduledAt: b.scheduled_at
    }));

    return {
      output: {
        campaigns,
        total: result?.total,
        pageNumber: result?.page_number,
        pageSize: result?.page_size
      },
      message: `Retrieved **${campaigns.length}** campaigns (page ${ctx.input.pageNumber}).`
    };
  })
  .build();
