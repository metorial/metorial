import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleAdminActionScopes } from '../scopes';
import { spec } from '../spec';

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `Search and list groups in the Google Workspace domain. Can filter by domain, member, or search query. Returns group details with pagination support.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .scopes(googleAdminActionScopes.listGroups)
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Search query to filter groups. Supports name and email prefix matching.'),
      domain: z.string().optional().describe('Domain to scope the listing to'),
      userKey: z
        .string()
        .optional()
        .describe('List only groups that this user or group is a member of (email or ID)'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of results (1-200). Defaults to 200.'),
      pageToken: z.string().optional().describe('Token for the next page of results'),
      orderBy: z.enum(['email']).optional().describe('Field to sort results by')
    })
  )
  .output(
    z.object({
      groups: z.array(
        z.object({
          groupId: z.string().optional(),
          email: z.string().optional(),
          name: z.string().optional(),
          description: z.string().optional(),
          directMembersCount: z.string().optional(),
          adminCreated: z.boolean().optional()
        })
      ),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      customerId: ctx.config.customerId,
      domain: ctx.config.domain
    });

    let result = await client.listGroups({
      query: ctx.input.query,
      domain: ctx.input.domain,
      userKey: ctx.input.userKey,
      maxResults: ctx.input.maxResults,
      pageToken: ctx.input.pageToken,
      orderBy: ctx.input.orderBy
    });

    let groups = (result.groups || []).map((g: any) => ({
      groupId: g.id,
      email: g.email,
      name: g.name,
      description: g.description,
      directMembersCount: g.directMembersCount,
      adminCreated: g.adminCreated
    }));

    return {
      output: {
        groups,
        nextPageToken: result.nextPageToken
      },
      message: `Found **${groups.length}** groups.${result.nextPageToken ? ' More results available.' : ''}`
    };
  })
  .build();
