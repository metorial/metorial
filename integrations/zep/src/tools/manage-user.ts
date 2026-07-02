import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageUser = SlateTool.create(spec, {
  name: 'Manage User',
  key: 'manage_user',
  description: `Create, retrieve, update, or delete a user in Zep. Users represent application end-users and are the foundation for user-specific knowledge graphs and conversation threads.`,
  instructions: [
    'Set the Zep user ID equal to your internal user ID for consistency.',
    'Provide at least a first name when creating a user; last name and email improve identification.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'delete'])
        .describe('The operation to perform on the user'),
      userId: z.string().describe('Unique identifier for the user'),
      email: z.string().optional().describe('Email address of the user'),
      firstName: z.string().optional().describe('First name of the user'),
      lastName: z.string().optional().describe('Last name of the user'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom metadata key-value pairs to associate with the user')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('The user ID'),
      uuid: z.string().optional().describe('Zep internal UUID for the user'),
      email: z.string().optional().nullable().describe('Email address'),
      firstName: z.string().optional().nullable().describe('First name'),
      lastName: z.string().optional().nullable().describe('Last name'),
      createdAt: z.string().optional().nullable().describe('Creation timestamp'),
      updatedAt: z.string().optional().nullable().describe('Last update timestamp'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .nullable()
        .describe('Custom metadata'),
      deleted: z.boolean().optional().describe('Whether the user was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    if (ctx.input.action === 'create') {
      let user = await client.createUser({
        userId: ctx.input.userId,
        email: ctx.input.email,
        firstName: ctx.input.firstName,
        lastName: ctx.input.lastName,
        metadata: ctx.input.metadata
      });
      return {
        output: {
          userId: user.user_id,
          uuid: user.uuid,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          metadata: user.metadata
        },
        message: `Created user **${user.user_id}**.`
      };
    }

    if (ctx.input.action === 'get') {
      let user = await client.getUser(ctx.input.userId);
      return {
        output: {
          userId: user.user_id,
          uuid: user.uuid,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          metadata: user.metadata
        },
        message: `Retrieved user **${user.user_id}**.`
      };
    }

    if (ctx.input.action === 'update') {
      let user = await client.updateUser(ctx.input.userId, {
        email: ctx.input.email,
        firstName: ctx.input.firstName,
        lastName: ctx.input.lastName,
        metadata: ctx.input.metadata
      });
      return {
        output: {
          userId: user.user_id,
          uuid: user.uuid,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          metadata: user.metadata
        },
        message: `Updated user **${ctx.input.userId}**.`
      };
    }

    // delete
    await client.deleteUser(ctx.input.userId);
    return {
      output: {
        userId: ctx.input.userId,
        deleted: true
      },
      message: `Deleted user **${ctx.input.userId}** and all associated threads and artifacts.`
    };
  })
  .build();
