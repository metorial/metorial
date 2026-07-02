import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getResource = SlateTool.create(spec, {
  name: 'Get Resource',
  key: 'get_resource',
  description: `Retrieve a single resource by ID, or list all resources with optional pagination.
Returns resource details including name, email, status, role, and custom fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resourceId: z
        .string()
        .optional()
        .describe('Specific resource ID to retrieve. If omitted, lists all resources.'),
      page: z.number().optional().describe('Page number for pagination (0-based)'),
      limit: z.number().optional().describe('Number of resources per page')
    })
  )
  .output(
    z.object({
      resources: z
        .array(
          z.object({
            resourceId: z.string().describe('Resource ID'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            email: z.string().optional().describe('Email address'),
            status: z.string().optional().describe('Resource status'),
            role: z.string().optional().describe('Role'),
            metadata: z.string().optional().describe('Custom metadata'),
            createdDate: z.string().optional().describe('Creation timestamp'),
            updatedDate: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('List of resources')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.resourceId) {
      let resource = await client.getResource(ctx.input.resourceId);
      return {
        output: {
          resources: [
            {
              resourceId: resource._id,
              firstName: resource.firstName,
              lastName: resource.lastName,
              email: resource.email,
              status: resource.status,
              role: resource.role,
              metadata: resource.metadata,
              createdDate: resource.createdDate,
              updatedDate: resource.updatedDate
            }
          ]
        },
        message: `Retrieved resource **${resource.firstName} ${resource.lastName || ''}** (ID: \`${resource._id}\`).`
      };
    }

    let resources = await client.getResources(ctx.input.page, ctx.input.limit);
    return {
      output: {
        resources: resources.map((r: any) => ({
          resourceId: r._id,
          firstName: r.firstName,
          lastName: r.lastName,
          email: r.email,
          status: r.status,
          role: r.role,
          metadata: r.metadata,
          createdDate: r.createdDate,
          updatedDate: r.updatedDate
        }))
      },
      message: `Retrieved **${resources.length}** resources.`
    };
  })
  .build();
