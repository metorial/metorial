import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let findUserOrGroup = SlateTool.create(spec, {
  name: 'Find User or Group',
  key: 'find_user_or_group',
  description: `Look up users or groups in the workspace. Search by name/email, or retrieve a specific user or group by ID. Useful for resolving ownership information or finding team members.`,
  instructions: [
    'Set lookupType to "user" to search or get users, or "group" for groups.',
    'Provide either a resourceId to get by ID, or a query to search.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      lookupType: z.enum(['user', 'group']).describe('Whether to look up a user or a group'),
      resourceId: z.string().optional().describe('Specific user or group ID to retrieve'),
      query: z
        .string()
        .optional()
        .describe('Search query (email or name for users, name for groups)'),
      includeArchived: z
        .boolean()
        .optional()
        .describe('Include archived users in search results (users only)'),
      cursor: z.string().optional().describe('Pagination cursor for search results')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.string().describe('User ID'),
            email: z.string().optional().describe('User email'),
            displayName: z.string().optional().describe('User display name'),
            organizationRole: z.string().optional().describe('Role in the organization'),
            isGuest: z.boolean().optional().describe('Whether the user is a guest'),
            archivedAt: z.string().nullable().optional().describe('Archive timestamp or null')
          })
        )
        .optional()
        .describe('Matched users (when lookupType is "user")'),
      groups: z
        .array(
          z.object({
            groupId: z.string().describe('Group ID'),
            name: z.string().describe('Group name'),
            description: z.string().optional().describe('Group description')
          })
        )
        .optional()
        .describe('Matched groups (when lookupType is "group")'),
      total: z.number().optional().describe('Total results for search queries'),
      hasNextPage: z.boolean().optional().describe('Whether more results are available'),
      nextCursor: z.string().nullable().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { lookupType, resourceId, query } = ctx.input;

    if (lookupType === 'user') {
      if (resourceId) {
        let user = await client.getUser(resourceId);
        return {
          output: {
            users: [
              {
                userId: user.id,
                email: user.email,
                displayName: user.displayName,
                organizationRole: user.organizationRole,
                isGuest: user.isGuest,
                archivedAt: user.archivedAt ?? null
              }
            ]
          },
          message: `Found user **${user.displayName}** (${user.email})`
        };
      }

      if (!query) {
        throw new Error('Either resourceId or query must be provided');
      }

      let result = await client.searchUsers(
        query,
        ctx.input.includeArchived,
        ctx.input.cursor
      );
      let users = (result.users || []).map((u: any) => ({
        userId: u.id,
        email: u.email,
        displayName: u.displayName,
        organizationRole: u.organizationRole,
        isGuest: u.isGuest,
        archivedAt: u.archivedAt ?? null
      }));

      return {
        output: {
          users,
          total: result.total,
          hasNextPage: result.hasNextPage,
          nextCursor: result.nextCursor ?? null
        },
        message: `Found **${users.length}** user(s) matching "${query}"`
      };
    }

    // Group lookup
    if (resourceId) {
      let group = await client.getGroup(resourceId);
      return {
        output: {
          groups: [
            {
              groupId: group.id,
              name: group.name,
              description: group.description
            }
          ]
        },
        message: `Found group **${group.name}**`
      };
    }

    if (!query) {
      throw new Error('Either resourceId or query must be provided');
    }

    let result = await client.searchGroups(query, ctx.input.cursor);
    let groups = (result.groups || []).map((g: any) => ({
      groupId: g.id,
      name: g.name,
      description: g.description
    }));

    return {
      output: {
        groups,
        total: result.total,
        hasNextPage: result.hasNextPage,
        nextCursor: result.nextCursor ?? null
      },
      message: `Found **${groups.length}** group(s) matching "${query}"`
    };
  })
  .build();
