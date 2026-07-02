import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createList = SlateTool.create(spec, {
  name: 'Create List',
  key: 'create_list',
  description: `Create a new contact list. Each list is an independent collection of contacts with its own custom fields and tags.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new list')
    })
  )
  .output(
    z.object({
      listId: z.string().describe('Unique identifier of the created list'),
      name: z.string().describe('Name of the created list'),
      doubleOptIn: z.boolean().describe('Whether double opt-in is enabled'),
      fields: z.array(
        z.object({
          tag: z.string(),
          type: z.string(),
          label: z.string(),
          fallback: z.string()
        })
      ),
      tags: z.array(z.string()),
      counts: z.object({
        pending: z.number(),
        subscribed: z.number(),
        unsubscribed: z.number()
      }),
      createdAt: z.string().describe('ISO 8601 creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let list = await client.createList(ctx.input.name);

    return {
      output: list,
      message: `Created list **${list.name}** (ID: \`${list.listId}\`).`
    };
  })
  .build();
