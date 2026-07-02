import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve a paginated list of users. Users represent individual learners or content creators. Can be filtered by client identifier.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      clientIdentifier: z.string().optional().describe('Filter users by client identifier'),
      page: z.number().optional().describe('Page number for pagination (starts at 0)'),
      length: z.number().optional().describe('Number of results per page (default: 100)')
    })
  )
  .output(
    z.object({
      users: z.array(z.record(z.string(), z.any())).describe('List of user objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.auth.userId,
      authScheme: ctx.auth.authScheme
    });

    let result = await client.listUsers({
      clientIdentifier: ctx.input.clientIdentifier,
      page: ctx.input.page,
      length: ctx.input.length
    });

    let users = Array.isArray(result) ? result : (result?.data ?? [result]);

    return {
      output: { users },
      message: `Retrieved ${users.length} user(s)${ctx.input.clientIdentifier ? ` for client \`${ctx.input.clientIdentifier}\`` : ''}.`
    };
  })
  .build();

export let updateUser = SlateTool.create(spec, {
  name: 'Update User',
  key: 'update_user',
  description: `Update a user's metadata and/or client association. Metadata is replaced entirely with the provided key-value pairs.`
})
  .input(
    z.object({
      identifier: z.string().describe('The user identifier to update'),
      clientIdentifier: z.string().optional().describe('Associate the user with this client'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Key-value metadata to set on the user (replaces existing metadata)')
    })
  )
  .output(
    z.object({
      user: z.record(z.string(), z.any()).describe('The updated user object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.auth.userId,
      authScheme: ctx.auth.authScheme
    });

    let result = await client.updateUser(ctx.input.identifier, {
      clientIdentifier: ctx.input.clientIdentifier,
      metadata: ctx.input.metadata
    });

    return {
      output: { user: result },
      message: `Updated user \`${ctx.input.identifier}\`.`
    };
  })
  .build();

export let deleteUser = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Delete a user by their identifier. You must specify how to handle any courses associated with this user: **reallocate** them to another user, **delete** them, or **ignore** (leave courses without an owner).`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      identifier: z.string().describe('The user identifier to delete'),
      courseAction: z
        .enum(['reallocate', 'delete', 'ignore'])
        .describe('How to handle courses owned by this user'),
      reallocateTo: z
        .string()
        .optional()
        .describe(
          'User identifier to reallocate courses to (required when courseAction is "reallocate")'
        ),
      clientIdentifier: z
        .string()
        .optional()
        .describe('Filter user deletion by client identifier')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the user was deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.auth.userId,
      authScheme: ctx.auth.authScheme
    });

    await client.deleteUser(ctx.input.identifier, {
      action: ctx.input.courseAction,
      reallocateTo: ctx.input.reallocateTo,
      clientIdentifier: ctx.input.clientIdentifier
    });

    return {
      output: { success: true },
      message: `Deleted user \`${ctx.input.identifier}\` (courses: ${ctx.input.courseAction}).`
    };
  })
  .build();
