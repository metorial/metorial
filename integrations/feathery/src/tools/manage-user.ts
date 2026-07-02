import { SlateTool } from 'slates';
import { z } from 'zod';
import { FeatheryClient } from '../lib/client';
import { spec } from '../spec';

export let createUser = SlateTool.create(spec, {
  name: 'Create User',
  key: 'create_user',
  description: `Create a new user (form submitter) in Feathery with a specified ID.`
})
  .input(
    z.object({
      userId: z.string().describe('Unique identifier for the new user')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('ID of the created user'),
      created: z.boolean().describe('Whether the user was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FeatheryClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    await client.createUser(ctx.input.userId);

    return {
      output: {
        userId: ctx.input.userId,
        created: true
      },
      message: `Created user **${ctx.input.userId}**.`
    };
  })
  .build();

export let deleteUser = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Permanently delete a user and all their associated data from Feathery.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('ID of the user to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FeatheryClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    await client.deleteUser(ctx.input.userId);

    return {
      output: { deleted: true },
      message: `Deleted user **${ctx.input.userId}**.`
    };
  })
  .build();
