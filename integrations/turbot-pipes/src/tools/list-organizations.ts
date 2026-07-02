import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let orgSchema = z.object({
  orgId: z.string().describe('Unique organization identifier'),
  handle: z.string().describe('Organization handle'),
  displayName: z.string().optional().describe('Display name'),
  avatarUrl: z.string().optional().describe('Avatar URL'),
  url: z.string().optional().describe('Organization URL'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listOrganizations = SlateTool.create(spec, {
  name: 'List Organizations',
  key: 'list_organizations',
  description: `List organizations the authenticated user has access to. Organizations allow teams to collaborate and share workspaces, connections, and other resources.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of results to return'),
      nextToken: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      organizations: z.array(orgSchema).describe('List of organizations'),
      nextToken: z.string().optional().describe('Pagination cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listOrgs({
      limit: ctx.input.limit,
      nextToken: ctx.input.nextToken
    });

    return {
      output: {
        organizations: result.items,
        nextToken: result.nextToken
      },
      message: `Found **${result.items.length}** organization(s)${result.nextToken ? ' (more available)' : ''}.`
    };
  })
  .build();
