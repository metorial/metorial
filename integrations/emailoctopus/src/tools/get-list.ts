import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { listIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getList = SlateTool.create(spec, {
  name: 'Get List',
  key: 'get_list',
  description: `Retrieve details of a specific contact list by its ID. Returns list configuration including name, custom fields, tags, and contact counts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listId: listIdSchema
    })
  )
  .output(
    z.object({
      listId: z.string().describe('Unique identifier of the list'),
      name: z.string().describe('Name of the list'),
      doubleOptIn: z.boolean().describe('Whether double opt-in is enabled'),
      fields: z
        .array(
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
        )
        .describe('Custom fields defined on the list'),
      tags: z.array(z.string()).describe('Tags defined on the list'),
      counts: z
        .object({
          pending: z.number(),
          subscribed: z.number(),
          unsubscribed: z.number()
        })
        .describe('Contact counts by status'),
      createdAt: z.string().describe('ISO 8601 creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let list = await client.getList(ctx.input.listId);

    return {
      output: list,
      message: `Retrieved list **${list.name}** with ${list.counts.subscribed} subscribed contact(s).`
    };
  })
  .build();
