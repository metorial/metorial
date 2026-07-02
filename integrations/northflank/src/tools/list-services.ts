import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listServices = SlateTool.create(spec, {
  name: 'List Services',
  key: 'list_services',
  description: `Lists all services within a Northflank project, including build services, deployment services, and combined services. Returns service type, status, and configuration summary.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID to list services for'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Results per page (max 100)'),
      cursor: z.string().optional().describe('Cursor from a previous response for pagination')
    })
  )
  .output(
    z.object({
      services: z.array(
        z.object({
          serviceId: z.string().describe('Unique service identifier'),
          name: z.string().describe('Service name'),
          serviceType: z.string().describe('Service type: combined, build, or deployment'),
          description: z.string().optional().describe('Service description'),
          tags: z.array(z.string()).describe('Tags applied to this service')
        })
      ),
      hasNextPage: z.boolean().describe('Whether more results are available'),
      cursor: z.string().optional().describe('Cursor for the next page'),
      count: z.number().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      teamId: ctx.config.teamId
    });

    let result = await client.listServices(ctx.input.projectId, {
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      cursor: ctx.input.cursor
    });

    let services = (result.data?.services || []).map((s: any) => ({
      serviceId: s.id,
      name: s.name,
      serviceType: s.serviceType,
      description: s.description,
      tags: s.tags || []
    }));

    return {
      output: {
        services,
        hasNextPage: result.pagination.hasNextPage,
        cursor: result.pagination.cursor,
        count: result.pagination.count
      },
      message: `Found **${services.length}** service(s) in project **${ctx.input.projectId}**.`
    };
  })
  .build();
