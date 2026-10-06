import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { id, invalid, type Row, text, unexpected } from '../lib/contracts';
import { spec } from '../spec';

export let manageUserTool = SlateTool.create(spec, {
  name: 'Manage User',
  key: 'manage_user',
  description: `Create, update, deactivate, or reactivate a Lever user. Supports setting access roles, name, email, and external directory ID for HRIS integration.`,
  constraints: [
    'Changing the access role to interviewer removes the user’s followed profiles. Replacement updates preserve current fields; concurrent changes after the final read remain possible.'
  ],
  instructions: [
    'To create a new user, set action to "create" and provide name and email.',
    'To update, provide userId and fields to change.',
    'To deactivate/reactivate, provide userId and the corresponding action.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'deactivate', 'reactivate'])
        .describe('Action to perform'),
      userId: z
        .string()
        .optional()
        .describe('User ID (required for update/deactivate/reactivate)'),
      name: z.string().optional().describe('User full name'),
      email: z.string().optional().describe('User email address'),
      accessRole: z
        .enum(['super admin', 'admin', 'team member', 'limited team member', 'interviewer'])
        .optional()
        .describe('User access role'),
      externalDirectoryId: z
        .string()
        .optional()
        .describe('External directory ID for HRIS integration')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('ID of the user'),
      user: z.any().optional().describe('The user object (for create/update)'),
      deactivated: z.boolean().optional().describe('True if user was deactivated'),
      reactivated: z.boolean().optional().describe('True if user was reactivated')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(ctx.auth);
    const data: Row = {};
    for (const key of ['name', 'email', 'externalDirectoryId'] as const)
      if (ctx.input[key] !== undefined)
        data[key] = text(ctx.input[key], key, key === 'externalDirectoryId');
    if (ctx.input.email !== undefined && !z.email().safeParse(ctx.input.email).success)
      invalid('Provide a valid user email address.');
    if (ctx.input.accessRole !== undefined) data.accessRole = ctx.input.accessRole;
    if (ctx.input.action === 'create') {
      text(ctx.input.name, 'User name');
      text(ctx.input.email, 'User email');
      if (ctx.input.userId !== undefined)
        invalid('Do not supply userId when creating a user.');
      const result = await client.createUser(data);
      return {
        output: { userId: result.data.id, user: result.data },
        message: `Created user ${result.data.id}.`
      };
    }
    const userId = id(ctx.input.userId, 'User ID; discover it with list_users');
    if (ctx.input.action === 'update') {
      if (!Object.keys(data).length) invalid('Provide at least one user field to update.');
      const result = await client.updateUser(userId, data);
      return { output: { userId, user: result.data }, message: `Updated user ${userId}.` };
    }
    if (Object.keys(data).length)
      invalid('User field updates cannot be combined with deactivation or reactivation.');
    const result =
      ctx.input.action === 'deactivate'
        ? await client.deactivateUser(userId)
        : await client.reactivateUser(userId);
    if (
      ctx.input.action === 'deactivate'
        ? typeof result.data.deactivatedAt !== 'number' ||
          !Number.isFinite(result.data.deactivatedAt)
        : result.data.deactivatedAt !== null
    )
      unexpected();
    return {
      output: {
        userId,
        ...(ctx.input.action === 'deactivate' ? { deactivated: true } : { reactivated: true })
      },
      message: `${ctx.input.action === 'deactivate' ? 'Deactivated' : 'Reactivated'} user ${userId}.`
    };
  })
  .build();
