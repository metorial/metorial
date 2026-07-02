import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageUserTool = SlateTool.create(spec, {
  name: 'Manage User',
  key: 'manage_user',
  description: `Create, update, deactivate, or reactivate a Lever user. Supports setting access roles, name, email, and external directory ID for HRIS integration.`,
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
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

    if (ctx.input.action === 'deactivate') {
      if (!ctx.input.userId) throw new Error('userId is required for deactivate action');
      await client.deactivateUser(ctx.input.userId);
      return {
        output: { userId: ctx.input.userId, deactivated: true },
        message: `Deactivated user **${ctx.input.userId}**.`
      };
    }

    if (ctx.input.action === 'reactivate') {
      if (!ctx.input.userId) throw new Error('userId is required for reactivate action');
      await client.reactivateUser(ctx.input.userId);
      return {
        output: { userId: ctx.input.userId, reactivated: true },
        message: `Reactivated user **${ctx.input.userId}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.userId) throw new Error('userId is required for update action');
      let updateData: Record<string, any> = {};
      if (ctx.input.name) updateData.name = ctx.input.name;
      if (ctx.input.email) updateData.email = ctx.input.email;
      if (ctx.input.accessRole) updateData.accessRole = ctx.input.accessRole;
      if (ctx.input.externalDirectoryId)
        updateData.externalDirectoryId = ctx.input.externalDirectoryId;

      let result = await client.updateUser(ctx.input.userId, updateData);
      return {
        output: { userId: result.data.id, user: result.data },
        message: `Updated user **${result.data.id}**.`
      };
    }

    // Create
    let createData: Record<string, any> = {};
    if (ctx.input.name) createData.name = ctx.input.name;
    if (ctx.input.email) createData.email = ctx.input.email;
    if (ctx.input.accessRole) createData.accessRole = ctx.input.accessRole;
    if (ctx.input.externalDirectoryId)
      createData.externalDirectoryId = ctx.input.externalDirectoryId;

    let result = await client.createUser(createData);
    return {
      output: { userId: result.data.id, user: result.data },
      message: `Created user **${result.data.name || result.data.id}**.`
    };
  })
  .build();
