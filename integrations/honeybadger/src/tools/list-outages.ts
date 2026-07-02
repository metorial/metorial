import { SlateTool } from 'slates';
import { z } from 'zod';
import { HoneybadgerClient } from '../lib/client';
import { spec } from '../spec';

export let listOutages = SlateTool.create(spec, {
  name: 'List Outages',
  key: 'list_outages',
  description: `Retrieve the outage history for a specific uptime check (site). Shows when the site went down, when it came back up, the HTTP status code, and the reason for the outage.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID'),
      siteId: z.string().describe('Site ID to get outages for'),
      createdAfter: z
        .number()
        .optional()
        .describe('Filter outages created after this Unix timestamp'),
      createdBefore: z
        .number()
        .optional()
        .describe('Filter outages created before this Unix timestamp'),
      limit: z.number().optional().describe('Max results to return (max 25)')
    })
  )
  .output(
    z.object({
      outages: z
        .array(
          z.object({
            downAt: z.string().optional().describe('When the site went down'),
            upAt: z.string().optional().describe('When the site came back up'),
            createdAt: z.string().optional().describe('When the outage was recorded'),
            status: z.number().optional().describe('HTTP status code'),
            reason: z.string().optional().describe('Reason for the outage')
          })
        )
        .describe('List of outages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HoneybadgerClient({ token: ctx.auth.token });
    let data = await client.listOutages(ctx.input.projectId, ctx.input.siteId, {
      createdAfter: ctx.input.createdAfter,
      createdBefore: ctx.input.createdBefore,
      limit: ctx.input.limit
    });

    let outages = (data.results || []).map((o: any) => ({
      downAt: o.down_at,
      upAt: o.up_at,
      createdAt: o.created_at,
      status: o.status,
      reason: o.reason
    }));

    return {
      output: { outages },
      message: `Found **${outages.length}** outage(s) for site ${ctx.input.siteId}.`
    };
  })
  .build();
