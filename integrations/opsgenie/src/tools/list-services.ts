import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { getNextNumericOffset } from '../lib/paging';
import { spec } from '../spec';

export let listServices = SlateTool.create(spec, {
  name: 'List Services',
  key: 'list_services',
  description: `List services in the OpsGenie account. Supports filtering, pagination, and sorting. Only available on Standard and Enterprise plans.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Filter query for services'),
      limit: z
        .number()
        .optional()
        .describe('Number of services to return (max 100, default 20)'),
      offset: z.number().optional().describe('Start index for pagination'),
      sort: z
        .enum(['name', 'updatedAt', 'insertedAt', 'createdAt', 'isExternal'])
        .optional()
        .describe('Field to sort by'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      services: z.array(
        z.object({
          serviceId: z.string().describe('Service ID'),
          name: z.string().describe('Service name'),
          description: z.string().optional().describe('Service description'),
          teamId: z.string().optional().describe('Owning team ID'),
          tags: z.array(z.string()).optional().describe('Service tags'),
          isExternal: z.boolean().optional().describe('Whether the service is external')
        })
      ),
      totalCount: z.number().describe('Number of services returned'),
      hasMore: z.boolean().describe('Whether another page of services is available'),
      nextOffset: z
        .number()
        .optional()
        .describe('Offset to pass to fetch the next page, when more services are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpsGenieClient({
      token: ctx.auth.token,
      instance: ctx.config.instance
    });

    let response = await client.listServices(ctx.input);
    let data = response.data ?? [];
    let nextOffset = getNextNumericOffset(response.paging);

    let services = data.map((s: any) => ({
      serviceId: s.id,
      name: s.name,
      description: s.description,
      teamId: s.teamId,
      tags: s.tags,
      isExternal: s.isExternal
    }));

    return {
      output: {
        services,
        totalCount: services.length,
        hasMore: nextOffset !== undefined,
        nextOffset
      },
      message: `Found **${services.length}** services.`
    };
  })
  .build();
