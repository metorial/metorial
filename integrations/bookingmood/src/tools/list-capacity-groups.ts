import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

export let listCapacityGroups = SlateTool.create(spec, {
  name: 'List Capacity Groups',
  key: 'list_capacity_groups',
  description:
    'Lists occupancy groups such as adults, children, and pets. Use the returned IDs as occupancy keys in search_availability and create_booking. Includes localized names and whether guests must explicitly provide a count.',
  constraints: ['Maximum 1000 results per request.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      filters: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'PostgREST-style filters; for example, organization_id=eq.<organization ID from list_organizations>'
        ),
      order: z.string().optional().describe('Sort order; defaults to order.asc,id.asc'),
      limit: z.number().int().min(1).max(1000).optional().describe('Maximum number of groups'),
      offset: z.number().int().nonnegative().optional().describe('Number of groups to skip')
    })
  )
  .output(
    z.object({
      capacityGroups: z.array(
        z.object({
          capacityGroupId: z.string().describe('ID to use as an occupancy key'),
          organizationId: z.string().describe('Organization defining this group'),
          name: z.record(z.string(), z.string()).describe('Localized group name'),
          nameSingular: z.record(z.string(), z.string()).describe('Localized singular name'),
          description: z
            .record(z.string(), z.string())
            .describe('Localized group description'),
          order: z.number().describe('Display order'),
          requiresExplicitInput: z
            .boolean()
            .describe('Whether an explicit guest count is required'),
          type: z.enum(['manual', 'sum']).describe('Manual input or calculated sum')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new BookingmoodClient(ctx.auth.token);
    let groups = await client.listCapacityGroups({
      select:
        'id,organization_id,name,name_singular,description,order,requires_explicit_input,type',
      filters: ctx.input.filters,
      order: ctx.input.order ?? 'order.asc,id.asc',
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });
    return {
      output: {
        capacityGroups: groups.map(group => ({
          capacityGroupId: group.id,
          organizationId: group.organization_id,
          name: group.name,
          nameSingular: group.name_singular,
          description: group.description,
          order: group.order,
          requiresExplicitInput: group.requires_explicit_input,
          type: group.type
        }))
      },
      message: `Found **${groups.length}** occupancy group(s).`
    };
  })
  .build();
