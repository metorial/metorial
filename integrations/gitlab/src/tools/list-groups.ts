import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitLabClient } from '../lib/client';
import { spec } from '../spec';

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `List GitLab groups accessible to the authenticated user. Filter by search term or ownership.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search term to filter groups by name'),
      owned: z
        .boolean()
        .optional()
        .describe('Only list groups owned by the authenticated user'),
      orderBy: z.enum(['name', 'path', 'id']).optional().describe('Order by field'),
      sort: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      perPage: z.number().optional().describe('Results per page (max 100)'),
      page: z.number().optional().describe('Page number')
    })
  )
  .output(
    z.object({
      groups: z.array(
        z.object({
          groupId: z.number().describe('Group ID'),
          name: z.string().describe('Group name'),
          path: z.string().describe('Group path'),
          fullPath: z.string().describe('Full group path'),
          description: z.string().nullable().describe('Group description'),
          visibility: z.string().describe('Visibility level'),
          webUrl: z.string().describe('URL to the group'),
          parentId: z.number().nullable().describe('Parent group ID if a subgroup')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitLabClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    let groups = await client.listGroups({
      search: ctx.input.search,
      owned: ctx.input.owned,
      orderBy: ctx.input.orderBy,
      sort: ctx.input.sort,
      perPage: ctx.input.perPage,
      page: ctx.input.page
    });

    let mapped = groups.map((g: any) => ({
      groupId: g.id,
      name: g.name,
      path: g.path,
      fullPath: g.full_path,
      description: g.description || null,
      visibility: g.visibility,
      webUrl: g.web_url,
      parentId: g.parent_id || null
    }));

    return {
      output: { groups: mapped },
      message: `Found **${mapped.length}** groups${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}`
    };
  })
  .build();
