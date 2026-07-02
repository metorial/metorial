import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List and search Brightspace users. Supports filtering by username, email, or org-defined ID. Returns paginated results with a bookmark for fetching the next page.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      userName: z.string().optional().describe('Filter by username (partial match)'),
      externalEmail: z.string().optional().describe('Filter by external email'),
      orgDefinedId: z.string().optional().describe('Filter by org-defined ID'),
      bookmark: z.string().optional().describe('Pagination bookmark from a previous request')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.string().describe('User ID'),
            userName: z.string().optional().describe('Username'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            externalEmail: z.string().optional().describe('External email'),
            orgDefinedId: z.string().optional().describe('Org-defined ID'),
            isActive: z.boolean().optional().describe('Whether user is active')
          })
        )
        .describe('List of users'),
      nextBookmark: z.string().optional().describe('Bookmark for the next page of results'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let result = await client.listUsers({
      userName: ctx.input.userName,
      externalEmail: ctx.input.externalEmail,
      orgDefinedId: ctx.input.orgDefinedId,
      bookmark: ctx.input.bookmark
    });

    let items = result?.Items || (Array.isArray(result) ? result : []);
    let users = items.map((u: any) => ({
      userId: String(u.UserId),
      userName: u.UserName,
      firstName: u.FirstName,
      lastName: u.LastName,
      externalEmail: u.ExternalEmail,
      orgDefinedId: u.OrgDefinedId,
      isActive: u.Activation?.IsActive
    }));

    return {
      output: {
        users,
        nextBookmark: result?.PagingInfo?.Bookmark || undefined,
        hasMore: result?.PagingInfo?.HasMoreItems || false
      },
      message: `Found **${users.length}** user(s).${result?.PagingInfo?.HasMoreItems ? ' More results available.' : ''}`
    };
  })
  .build();
