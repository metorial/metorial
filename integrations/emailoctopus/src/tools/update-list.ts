import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { listIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let updateList = SlateTool.create(spec, {
  name: 'Update List',
  key: 'update_list',
  description: `Update an existing contact list's name.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      listId: listIdSchema,
      name: z.string().describe('New name for the list')
    })
  )
  .output(
    z.object({
      listId: z.string().describe('Unique identifier of the updated list'),
      name: z.string().describe('Updated name of the list'),
      doubleOptIn: z.boolean(),
      fields: z.array(
        z.object({
          tag: z.string(),
          type: z.string(),
          label: z.string(),
          fallback: z
            .string()
            .describe(
              'Fallback display text; absent or null provider fallback is an empty string'
            ),
          fallbackValue: z
            .string()
            .nullable()
            .optional()
            .describe('Original provider fallback, when supplied')
        })
      ),
      tags: z.array(z.string()),
      counts: z.object({
        pending: z.number(),
        subscribed: z.number(),
        unsubscribed: z.number()
      }),
      createdAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let list = await client.updateList(ctx.input.listId, ctx.input.name);

    return {
      output: list,
      message: `Updated list to **${list.name}**.`
    };
  })
  .build();
