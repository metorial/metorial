import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `Retrieve all email campaigns. Returns campaign details including status, subject, sender info, and target lists. Campaigns are read-only via the API.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startingAfter: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      campaigns: z.array(
        z.object({
          campaignId: z.string().describe('Unique identifier of the campaign'),
          status: z.string().describe('Campaign status: DRAFT, SENDING, SENT, or ERROR'),
          name: z.string().describe('Internal campaign name'),
          subject: z.string().describe('Email subject line'),
          to: z.array(z.string()).describe('List IDs the campaign targets'),
          from: z.object({
            name: z.string().describe('Sender name'),
            emailAddress: z.string().describe('Sender email address')
          }),
          createdAt: z.string().describe('ISO 8601 creation timestamp'),
          sentAt: z.string().nullable().describe('ISO 8601 sent timestamp, null if not sent')
        })
      ),
      pagingNext: z.string().nullable().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getCampaigns(ctx.input.startingAfter);

    return {
      output: {
        campaigns: result.data.map(c => ({
          campaignId: c.campaignId,
          status: c.status,
          name: c.name,
          subject: c.subject,
          to: c.to,
          from: c.from,
          createdAt: c.createdAt,
          sentAt: c.sentAt
        })),
        pagingNext: result.pagingNext
      },
      message: `Retrieved ${result.data.length} campaign(s).${result.pagingNext ? ' More results available.' : ''}`
    };
  })
  .build();
