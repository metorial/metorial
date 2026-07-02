import { SlateTool } from 'slates';
import { z } from 'zod';
import { OktaClient } from '../lib/client';
import { spec } from '../spec';

let groupSchema = z.object({
  groupId: z.string().describe('Unique Okta group ID'),
  name: z.string().describe('Group name'),
  description: z.string().optional().describe('Group description'),
  type: z.string().describe('Group type (OKTA_GROUP, APP_GROUP, BUILT_IN)'),
  created: z.string(),
  lastUpdated: z.string(),
  lastMembershipUpdated: z.string()
});

export let listGroupsTool = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `Search and list groups in your Okta organization. Supports keyword search by name, filter expressions, and SCIM search queries.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search groups by name (starts-with matching)'),
      filter: z.string().optional().describe('Okta filter expression'),
      search: z.string().optional().describe('SCIM search expression'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of groups to return (default 200)'),
      after: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      groups: z.array(groupSchema),
      nextCursor: z.string().optional(),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new OktaClient({
      domain: ctx.config.domain,
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let result = await client.listGroups({
      query: ctx.input.query,
      filter: ctx.input.filter,
      search: ctx.input.search,
      limit: ctx.input.limit,
      after: ctx.input.after
    });

    let groups = result.items.map(g => ({
      groupId: g.id,
      name: g.profile.name,
      description: g.profile.description,
      type: g.type,
      created: g.created,
      lastUpdated: g.lastUpdated,
      lastMembershipUpdated: g.lastMembershipUpdated
    }));

    let nextCursor: string | undefined;
    if (result.nextUrl) {
      let url = new URL(result.nextUrl);
      nextCursor = url.searchParams.get('after') || undefined;
    }

    return {
      output: {
        groups,
        nextCursor,
        hasMore: !!result.nextUrl
      },
      message: `Found **${groups.length}** group(s)${result.nextUrl ? ' (more available)' : ''}.`
    };
  })
  .build();
