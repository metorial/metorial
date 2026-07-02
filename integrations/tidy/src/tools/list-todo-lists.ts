import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listToDoLists = SlateTool.create(spec, {
  name: 'List To-Do Lists',
  key: 'list_todo_lists',
  description: `List active to-do lists that define tasks to be completed during jobs. Optionally filter by address. To-do list IDs can be used when creating or updating jobs to specify what work should be done.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      addressId: z.string().optional().describe('Filter to-do lists by address ID')
    })
  )
  .output(
    z.object({
      toDoLists: z
        .array(
          z.object({
            toDoListId: z.string().describe('Unique identifier for the to-do list'),
            addressId: z.string().nullable().describe('Associated address ID'),
            title: z.string().nullable().describe('Title of the to-do list'),
            items: z.array(z.any()).nullable().describe('Items in the to-do list'),
            createdAt: z
              .string()
              .nullable()
              .describe('Timestamp when the to-do list was created')
          })
        )
        .describe('List of active to-do lists')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listToDoLists(ctx.input.addressId);
    let lists = (result.data ?? result ?? []).map((list: any) => ({
      toDoListId: list.id,
      addressId: list.address_id ?? null,
      title: list.title ?? list.name ?? null,
      items: list.items ?? list.to_dos ?? null,
      createdAt: list.created_at ?? null
    }));

    return {
      output: { toDoLists: lists },
      message: `Found **${lists.length}** to-do list(s).`
    };
  })
  .build();
