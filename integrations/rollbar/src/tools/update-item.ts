import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, mapItem } from '../lib/client';
import { spec } from '../spec';

export let updateItem = SlateTool.create(spec, {
  name: 'Update Item',
  key: 'update_item',
  description:
    'Update an item’s status, severity, title or assigned user. Use assignedUserId from list_users to assign or null to unassign. Legacy assignedUser resolves a username with an account read token. Archived status is retained for compatibility; current API documentation only guarantees active, resolved and muted.',
  tags: { destructive: false }
})
  .input(
    z.object({
      itemId: z.number().describe('Unique item ID to update'),
      projectId: z
        .number()
        .optional()
        .describe('Project ID from manage_project; required with an account token.'),
      status: z
        .enum(['active', 'resolved', 'muted', 'archived'])
        .optional()
        .describe('New item status'),
      level: z
        .enum(['debug', 'info', 'warning', 'error', 'critical'])
        .optional()
        .describe('New severity level'),
      title: z.string().optional().describe('New item title, 1–255 characters'),
      assignedUser: z
        .string()
        .optional()
        .describe('Legacy username assignment; requires account read access to list_users'),
      assignedUserId: z
        .number()
        .nullable()
        .optional()
        .describe(
          'User ID from list_users; null removes the assignment. Do not combine with assignedUser.'
        ),
      resolvedInVersion: z
        .string()
        .optional()
        .describe('Code version, at most 40 characters; requires status resolved')
    })
  )
  .output(
    z.object({
      itemId: z.number().describe('Unique item ID'),
      counter: z.number().describe('Project-specific item counter'),
      title: z.string().describe('Item title/message'),
      status: z.string().describe('Current item status'),
      level: z.string().describe('Severity level')
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    if (ctx.input.assignedUser !== undefined && ctx.input.assignedUserId !== undefined)
      throw createApiServiceError('Provide assignedUserId or assignedUser, not both.');
    let assignedUserId = ctx.input.assignedUserId;
    if (ctx.input.assignedUser !== undefined) {
      const users = (await client.listUsers()).result.users;
      const user = users.find(user => user.username === ctx.input.assignedUser);
      if (!user)
        throw createApiServiceError(
          'No account user matches assignedUser. Use a user ID from list_users.'
        );
      assignedUserId = user.id;
    }
    const item = (
      await client.updateItem(ctx.input.itemId, {
        status: ctx.input.status,
        level: ctx.input.level,
        title: ctx.input.title,
        assigned_user_id: assignedUserId,
        resolved_in_version: ctx.input.resolvedInVersion
      })
    ).result;
    return {
      output: mapItem(item),
      message: `Updated item #${item.counter}: ${item.title} (${item.status}).`
    };
  })
  .build();
