import { SlateTool } from 'slates';
import { z } from 'zod';
import { HoneybadgerClient } from '../lib/client';
import type { Outage } from '../lib/types';
import { nextUrlSchema, projectIdSchema } from '../lib/validation';
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
      nextUrl: nextUrlSchema,
      projectId: projectIdSchema,
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
      nextUrl: z
        .string()
        .optional()
        .describe('Next-page URL, when another page may be available'),
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
    let client = new HoneybadgerClient(ctx.auth);
    let data = await client.listOutages(ctx.input.projectId, ctx.input.siteId, {
      nextUrl: ctx.input.nextUrl,
      createdAfter: ctx.input.createdAfter,
      createdBefore: ctx.input.createdBefore,
      limit: ctx.input.limit
    });

    let outages = (data.results || []).map((o: Outage) => ({
      downAt: o.down_at ?? undefined,
      upAt: o.up_at ?? undefined,
      createdAt: o.created_at ?? undefined,
      status: o.status ?? undefined,
      reason: o.reason ?? undefined
    }));

    return {
      output: { outages, nextUrl: data.links?.next ?? undefined },
      message: `Found **${outages.length}** outage(s) for site ${ctx.input.siteId}.`
    };
  })
  .build();
