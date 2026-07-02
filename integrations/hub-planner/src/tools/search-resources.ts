import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchResources = SlateTool.create(spec, {
  name: 'Search Resources',
  key: 'search_resources',
  description: `Search and filter resources using advanced query operators. Supports filtering by name, email, status, role, and custom fields.
Use operators like **$in**, **$nin**, **$like** for flexible querying.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      firstName: z
        .any()
        .optional()
        .describe(
          'Filter by first name. String or operator object (e.g. { "$like": "John" })'
        ),
      lastName: z.any().optional().describe('Filter by last name'),
      email: z.any().optional().describe('Filter by email'),
      status: z
        .any()
        .optional()
        .describe('Filter by status (e.g. { "$in": ["STATUS_ACTIVE"] })'),
      role: z.any().optional().describe('Filter by role'),
      metadata: z.any().optional().describe('Filter by metadata')
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
            email: z.string().optional().describe('Email'),
            status: z.string().optional().describe('Status'),
            role: z.string().optional().describe('Role'),
            metadata: z.string().optional().describe('Custom metadata'),
            createdDate: z.string().optional().describe('Creation timestamp'),
            updatedDate: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('Matching resources')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let filters: Record<string, any> = {};

    if (ctx.input.firstName !== undefined) filters.firstName = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) filters.lastName = ctx.input.lastName;
    if (ctx.input.email !== undefined) filters.email = ctx.input.email;
    if (ctx.input.status !== undefined) filters.status = ctx.input.status;
    if (ctx.input.role !== undefined) filters.role = ctx.input.role;
    if (ctx.input.metadata !== undefined) filters.metadata = ctx.input.metadata;

    let resources = await client.searchResources(filters);
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
      message: `Found **${resources.length}** resources matching the search criteria.`
    };
  })
  .build();
