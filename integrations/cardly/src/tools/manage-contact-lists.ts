import { SlateTool } from 'slates';
import { z } from 'zod';
import { CardlyClient } from '../lib/client';
import { spec } from '../spec';

let contactListOutputSchema = z.object({
  listId: z.string().describe('Unique contact list ID'),
  name: z.string().describe('List name'),
  slug: z.string().describe('URL-friendly slug'),
  customFields: z
    .array(
      z.object({
        fieldId: z.string().describe('Custom field ID'),
        name: z.string().describe('Field name'),
        slug: z.string().describe('Field slug'),
        type: z.string().describe('Field type (text, date, number, url)')
      })
    )
    .describe('Custom fields defined for this list'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

let mapList = (l: Record<string, unknown>) => {
  let customFields =
    (l.customFields as Array<{ id: string; name: string; slug: string; type: string }>) || [];
  return {
    listId: l.id as string,
    name: l.name as string,
    slug: l.slug as string,
    customFields: customFields.map(f => ({
      fieldId: f.id,
      name: f.name,
      slug: f.slug,
      type: f.type
    })),
    createdAt: l.createdAt as string,
    updatedAt: l.updatedAt as string
  };
};

export let listContactLists = SlateTool.create(spec, {
  name: 'List Contact Lists',
  key: 'list_contact_lists',
  description: `Retrieve all active contact lists for your organisation, including their custom field definitions.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of results (default 25)'),
      offset: z.number().optional().describe('Number of records to skip')
    })
  )
  .output(
    z.object({
      lists: z.array(contactListOutputSchema).describe('Contact lists'),
      totalRecords: z.number().describe('Total number of lists')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CardlyClient({ token: ctx.auth.token });

    let result = await client.listContactLists({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let lists = result.lists.map(l => mapList(l as unknown as Record<string, unknown>));

    return {
      output: {
        lists,
        totalRecords: result.meta.totalRecords
      },
      message: `Found **${lists.length}** contact list(s) (${result.meta.totalRecords} total).`
    };
  })
  .build();

export let createContactList = SlateTool.create(spec, {
  name: 'Create Contact List',
  key: 'create_contact_list',
  description: `Create a new contact list with optional custom fields. Custom fields support text, date, number, and url types.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the contact list'),
      customFields: z
        .array(
          z.object({
            name: z.string().describe('Custom field name'),
            type: z.enum(['text', 'date', 'number', 'url']).describe('Custom field type')
          })
        )
        .optional()
        .describe('Custom fields to add to the list')
    })
  )
  .output(contactListOutputSchema)
  .handleInvocation(async ctx => {
    let client = new CardlyClient({ token: ctx.auth.token });

    let result = await client.createContactList({
      name: ctx.input.name,
      customFields: ctx.input.customFields
    });

    return {
      output: mapList(result as unknown as Record<string, unknown>),
      message: `Contact list **${result.name}** created with ID **${result.id}**.`
    };
  })
  .build();

export let deleteContactList = SlateTool.create(spec, {
  name: 'Delete Contact List',
  key: 'delete_contact_list',
  description: `Permanently delete a contact list and all contacts within it. This cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('UUID of the contact list to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the list was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CardlyClient({ token: ctx.auth.token });
    await client.deleteContactList(ctx.input.listId);

    return {
      output: { deleted: true },
      message: `Contact list **${ctx.input.listId}** deleted successfully.`
    };
  })
  .build();
