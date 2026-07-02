import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createList = SlateTool.create(spec, {
  name: 'Create List',
  key: 'create_list',
  description: `Create a new contact list in SendFox.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the list to create')
    })
  )
  .output(
    z.object({
      listId: z.number().describe('ID of the created list'),
      name: z.string().describe('Name of the list'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let list = await client.createList(ctx.input.name);

    return {
      output: {
        listId: list.id,
        name: list.name,
        createdAt: list.created_at
      },
      message: `List **${list.name}** created (ID: ${list.id}).`
    };
  })
  .build();
