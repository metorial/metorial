import { createApiServiceError, SlateTool } from 'slates';
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
      page: z.number().min(0).optional().describe('Page number for pagination (0-based)'),
      limit: z.number().min(1).max(1000).optional().describe('Number of resources per page')
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
            customFields: z.array(z.any()).optional().describe('Resource custom fields'),
            metadata: z.string().optional().describe('Custom metadata'),
            createdDate: z.string().optional().describe('Creation timestamp'),
            updatedDate: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('List of resources')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.page !== undefined && !Number.isInteger(ctx.input.page)) {
      throw createApiServiceError('page must be a whole number starting at 0.');
    }
    if (ctx.input.limit !== undefined && !Number.isInteger(ctx.input.limit)) {
      throw createApiServiceError('limit must be a whole number between 1 and 1000.');
    }
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.resourceId) {
      let resource = await client.getResource(ctx.input.resourceId);
      return {
        output: {
          resources: [
            {
              resourceId: resource._id,
              firstName: resource.firstName ?? undefined,
              lastName: resource.lastName ?? undefined,
              email: resource.email ?? undefined,
              status: resource.status ?? undefined,
              role: resource.role ?? undefined,
              customFields: resource.customFields ?? undefined,
              metadata: resource.metadata ?? undefined,
              createdDate: resource.createdDate ?? undefined,
              updatedDate: resource.updatedDate ?? undefined
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
          firstName: r.firstName ?? undefined,
          lastName: r.lastName ?? undefined,
          email: r.email ?? undefined,
          status: r.status ?? undefined,
          role: r.role ?? undefined,
          customFields: r.customFields ?? undefined,
          metadata: r.metadata ?? undefined,
          createdDate: r.createdDate ?? undefined,
          updatedDate: r.updatedDate ?? undefined
        }))
      },
      message: `Retrieved **${resources.length}** resources.`
    };
  })
  .build();
