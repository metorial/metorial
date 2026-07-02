import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsersTool = SlateTool.create(spec, {
  name: 'List Feedback Users',
  key: 'list_users',
  description: `List feedback users (people who provide feedback, not workspace members). These users can be associated with notes and companies.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageCursor: z.string().optional().describe('Cursor for pagination'),
      pageLimit: z.number().optional().describe('Maximum number of users per page')
    })
  )
  .output(
    z.object({
      users: z.array(z.record(z.string(), z.any())).describe('List of feedback users'),
      pageCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listUsers({
      pageCursor: ctx.input.pageCursor,
      pageLimit: ctx.input.pageLimit
    });

    return {
      output: {
        users: result.data,
        pageCursor: result.pageCursor
      },
      message: `Retrieved ${result.data.length} user(s).`
    };
  })
  .build();

export let createUserTool = SlateTool.create(spec, {
  name: 'Create Feedback User',
  key: 'create_user',
  description: `Create a new feedback user. Users represent people who provide product feedback and can be linked to companies.`
})
  .input(
    z.object({
      email: z.string().describe('Email address of the user'),
      name: z.string().optional().describe('Display name of the user'),
      externalId: z
        .string()
        .optional()
        .describe('External identifier for the user in your system'),
      companyId: z
        .string()
        .optional()
        .describe('ID of the company to associate this user with')
    })
  )
  .output(
    z.object({
      user: z.record(z.string(), z.any()).describe('The created user')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let user = await client.createUser({
      email: ctx.input.email,
      name: ctx.input.name,
      externalId: ctx.input.externalId,
      company: ctx.input.companyId ? { id: ctx.input.companyId } : undefined
    });

    return {
      output: { user },
      message: `Created user **${ctx.input.email}**.`
    };
  })
  .build();

export let updateUserTool = SlateTool.create(spec, {
  name: 'Update Feedback User',
  key: 'update_user',
  description: `Update an existing feedback user's name, external ID, or company association.`
})
  .input(
    z.object({
      userId: z.string().describe('The ID of the user to update'),
      name: z.string().optional().describe('New display name'),
      externalId: z.string().optional().describe('New external identifier'),
      companyId: z
        .string()
        .optional()
        .describe('ID of the company to associate this user with')
    })
  )
  .output(
    z.object({
      user: z.record(z.string(), z.any()).describe('The updated user')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let user = await client.updateUser(ctx.input.userId, {
      name: ctx.input.name,
      externalId: ctx.input.externalId,
      company: ctx.input.companyId ? { id: ctx.input.companyId } : undefined
    });

    return {
      output: { user },
      message: `Updated user **${ctx.input.userId}**.`
    };
  })
  .build();

export let deleteUserTool = SlateTool.create(spec, {
  name: 'Delete Feedback User',
  key: 'delete_user',
  description: `Permanently delete a feedback user. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('The ID of the user to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteUser(ctx.input.userId);

    return {
      output: { success: true },
      message: `Deleted user **${ctx.input.userId}**.`
    };
  })
  .build();
