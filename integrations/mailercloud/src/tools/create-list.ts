import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createList = SlateTool.create(spec, {
  name: 'Create List',
  key: 'create_list',
  description: `Create a new contact list (recipient list) in your Mailercloud account. Lists are used to organize and manage contacts for campaigns and automations.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z
        .string()
        .describe(
          'Name for the new list. Alphanumeric characters, underscores, hyphens, dots, and spaces are allowed.'
        )
    })
  )
  .output(
    z
      .object({
        listId: z.string().optional().describe('ID of the created list'),
        name: z.string().optional().describe('Name of the created list')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createList(ctx.input.name);

    let data = result?.data ?? result;

    return {
      output: {
        listId: data?.id ?? data?.enc_id ?? undefined,
        name: ctx.input.name,
        ...data
      },
      message: `Successfully created list **${ctx.input.name}**.`
    };
  })
  .build();
