import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `Retrieves a paginated list of email campaigns in your Sender account. Optionally filter by status (DRAFT, SCHEDULED, SENDING, SENT). Returns campaign details including subject, status, and timestamps.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().default(1).describe('Page number for pagination'),
      limit: z.number().optional().describe('Number of campaigns per page'),
      status: z
        .enum(['DRAFT', 'SCHEDULED', 'SENDING', 'SENT'])
        .optional()
        .describe('Filter campaigns by status')
    })
  )
  .output(
    z.object({
      campaigns: z
        .array(
          z.object({
            campaignId: z.string().describe('Campaign ID'),
            subject: z.string().describe('Campaign subject'),
            title: z.string().nullable().describe('Internal campaign title'),
            status: z.string().describe('Campaign status'),
            contentType: z.string().describe('Content type'),
            createdAt: z.string().describe('Creation timestamp'),
            modifiedAt: z.string().describe('Last modification timestamp')
          })
        )
        .describe('List of campaigns'),
      currentPage: z.number().describe('Current page number'),
      lastPage: z.number().describe('Total number of pages'),
      total: z.number().describe('Total number of campaigns')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listCampaigns({
      page: ctx.input.page,
      limit: ctx.input.limit,
      status: ctx.input.status
    });

    return {
      output: {
        campaigns: result.data.map(c => ({
          campaignId: c.id,
          subject: c.subject,
          title: c.title,
          status: c.status,
          contentType: c.content_type,
          createdAt: c.created,
          modifiedAt: c.modified
        })),
        currentPage: result.meta.current_page,
        lastPage: result.meta.last_page,
        total: result.meta.total
      },
      message: `Found **${result.meta.total}** campaign(s) (page ${result.meta.current_page}/${result.meta.last_page}).`
    };
  })
  .build();
