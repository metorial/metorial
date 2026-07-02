import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listZonesTool = SlateTool.create(spec, {
  name: 'List Zones',
  key: 'list_zones',
  description: `List all domains (zones) on the Cloudflare account. Optionally filter by domain name or status. Returns zone details including ID, name, status, nameservers, and plan information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter by domain name (exact match)'),
      status: z
        .string()
        .optional()
        .describe(
          'Filter by zone status (active, pending, initializing, moved, deleted, deactivated)'
        ),
      accountId: z.string().optional().describe('Filter by account ID'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of zones per page (max 50)')
    })
  )
  .output(
    z.object({
      zones: z.array(
        z.object({
          zoneId: z.string(),
          name: z.string(),
          status: z.string(),
          paused: z.boolean(),
          nameServers: z.array(z.string()),
          plan: z.string().optional(),
          createdOn: z.string().optional(),
          modifiedOn: z.string().optional()
        })
      ),
      totalCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let response = await client.listZones({
      name: ctx.input.name,
      status: ctx.input.status,
      accountId: ctx.input.accountId || ctx.config.accountId,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let zones = response.result.map((z: any) => ({
      zoneId: z.id,
      name: z.name,
      status: z.status,
      paused: z.paused,
      nameServers: z.name_servers || [],
      plan: z.plan?.name,
      createdOn: z.created_on,
      modifiedOn: z.modified_on
    }));

    return {
      output: {
        zones,
        totalCount: response.result_info?.total_count ?? zones.length
      },
      message: `Found **${zones.length}** zone(s).`
    };
  })
  .build();
