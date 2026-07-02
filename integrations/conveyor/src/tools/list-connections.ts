import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConveyorClient } from '../lib/client';
import { spec } from '../spec';

let connectionSchema = z.object({
  connectionId: z.string().describe('Unique ID of the connection'),
  createdAt: z.string().describe('When the connection was created'),
  updatedAt: z.string().describe('When the connection was last updated'),
  domain: z.string().describe('Domain of the connected organization'),
  crmLink: z.string().nullable().optional().describe('Link to the CRM record'),
  crmId: z.string().nullable().optional().describe('CRM record ID'),
  authorizationsCount: z.number().describe('Total number of authorizations'),
  authorizationsWithAccessCount: z.number().describe('Number of active authorizations'),
  authorizationsRemovedCount: z.number().describe('Number of revoked authorizations'),
  latestActivityAt: z.string().nullable().optional().describe('Timestamp of last activity')
});

export let listConnections = SlateTool.create(spec, {
  name: 'List Connections',
  key: 'list_connections',
  description: `Retrieve Trust Center connections (organizations/users who have accessed your Trust Center). Useful for analytics, CRM synchronization, and monitoring who is engaging with your security documentation. Supports filtering by domain and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z
        .string()
        .optional()
        .describe('Filter by domain (e.g., "acme.com" without https or www)'),
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 100)')
    })
  )
  .output(
    z.object({
      connections: z.array(connectionSchema).describe('List of connections'),
      page: z.number().describe('Current page number'),
      perPage: z.number().describe('Results per page'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConveyorClient({ token: ctx.auth.token });

    let data = await client.listConnections({
      domain: ctx.input.domain,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let connections = (data.connections || []).map((c: any) => ({
      connectionId: c.id,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      domain: c.domain,
      crmLink: c.crm_link,
      crmId: c.crm_id,
      authorizationsCount: c.authorizations_count,
      authorizationsWithAccessCount: c.authorizations_with_access_count,
      authorizationsRemovedCount: c.authorizations_removed_count,
      latestActivityAt: c.latest_activity_at
    }));

    return {
      output: {
        connections,
        page: data.page,
        perPage: data.per_page,
        totalPages: data.total_pages
      },
      message: `Found **${connections.length}** connections${ctx.input.domain ? ` for domain "${ctx.input.domain}"` : ''} (page ${data.page} of ${data.total_pages}).`
    };
  })
  .build();
