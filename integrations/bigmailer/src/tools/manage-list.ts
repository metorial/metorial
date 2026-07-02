import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageList = SlateTool.create(spec, {
  name: 'Create or Update List',
  key: 'create_or_update_list',
  description: `Create a new list or update an existing one within a brand. Lists behave like tags - contacts can belong to multiple lists without duplication. To update, provide \`listId\`. To create, omit \`listId\`.`,
  instructions: [
    'Omit listId to create a new list. Provide listId to update an existing one.',
    'BigMailer lists are virtual groups (tags); a contact can belong to multiple lists.'
  ]
})
  .input(
    z.object({
      brandId: z.string().describe('ID of the brand'),
      listId: z
        .string()
        .optional()
        .describe('ID of the list to update. Omit to create a new list.'),
      name: z.string().describe('Name of the list (1-50 characters)')
    })
  )
  .output(
    z.object({
      listId: z.string().describe('List unique identifier'),
      name: z.string().describe('List name'),
      isAllContacts: z
        .boolean()
        .describe('Whether this is the system list containing all contacts'),
      createdAt: z.string().describe('Creation timestamp (ISO 8601)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let isUpdate = !!ctx.input.listId;
    let list = isUpdate
      ? await client.updateList(ctx.input.brandId, ctx.input.listId!, { name: ctx.input.name })
      : await client.createList(ctx.input.brandId, { name: ctx.input.name });

    return {
      output: {
        listId: list.id,
        name: list.name,
        isAllContacts: list.all,
        createdAt: new Date(list.created * 1000).toISOString()
      },
      message: isUpdate
        ? `Updated list **${list.name}** (${list.id}).`
        : `Created list **${list.name}** (${list.id}).`
    };
  })
  .build();
