import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listOrgMachines = SlateTool.create(spec, {
  name: 'List Organization Machines',
  key: 'list_org_machines',
  description:
    'List Fly Machines across an organization, with filters for region, state, deletion status, and pagination. Use this for org-wide inventory and polling workflows.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orgSlug: z.string().describe('Fly.io organization slug'),
      includeDeleted: z.boolean().optional().describe('Include deleted machines'),
      region: z.string().optional().describe('Filter by region code'),
      state: z.string().optional().describe('Comma-separated machine states to include'),
      summary: z.boolean().optional().describe('Omit machine config details from responses'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Only return machines updated after this RFC 3339 timestamp'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      limit: z.number().optional().describe('Maximum machines to request, up to 1000')
    })
  )
  .output(
    z.object({
      machines: z
        .array(
          z.object({
            appName: z.string().describe('App the machine belongs to'),
            machineId: z.string().describe('Machine ID'),
            machineName: z.string().describe('Machine name'),
            state: z.string().describe('Machine state'),
            region: z.string().describe('Region code'),
            privateIp: z.string().describe('Private IPv6 address'),
            version: z.string().describe('Machine version'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp'),
            config: z.record(z.string(), z.any()).describe('Machine config when returned')
          })
        )
        .describe('Organization Machines'),
      nextCursor: z.string().describe('Cursor for the next page, if any'),
      lastMachineId: z.string().describe('Last machine ID in the response'),
      lastUpdatedAt: z.string().describe('Last updated_at value in the response'),
      errorRegions: z.array(z.string()).describe('Regions Fly.io could not query')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listOrgMachines(ctx.input.orgSlug, {
      includeDeleted: ctx.input.includeDeleted,
      region: ctx.input.region,
      state: ctx.input.state,
      summary: ctx.input.summary,
      updatedAfter: ctx.input.updatedAfter,
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    return {
      output: result,
      message: `Found **${result.machines.length}** machine(s) in organization **${ctx.input.orgSlug}**.`
    };
  })
  .build();
