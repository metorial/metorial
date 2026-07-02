import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { contactGroupSchema, customFieldSchema, formatContactGroup } from '../lib/schemas';
import { googleContactsActionScopes } from '../scopes';
import { spec } from '../spec';

export let createContactGroup = SlateTool.create(spec, {
  name: 'Create Contact Group',
  key: 'create_contact_group',
  description: `Creates a new contact group (label) for the authenticated user. Group names must be unique among the user's contact groups. Optionally attach client-specific key-value data.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleContactsActionScopes.createContactGroup)
  .input(
    z.object({
      name: z.string().describe('Name of the contact group (must be unique)'),
      clientData: z
        .array(customFieldSchema)
        .optional()
        .describe('Optional key-value pairs for client-specific data')
    })
  )
  .output(contactGroupSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createContactGroup(ctx.input.name, ctx.input.clientData);
    let group = formatContactGroup(result);

    return {
      output: group,
      message: `Created contact group **${ctx.input.name}** (${group.resourceName}).`
    };
  })
  .build();

export let updateContactGroup = SlateTool.create(spec, {
  name: 'Update Contact Group',
  key: 'update_contact_group',
  description: `Updates the name or client data of an existing user-defined contact group. System contact groups cannot be renamed.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleContactsActionScopes.updateContactGroup)
  .input(
    z.object({
      resourceName: z
        .string()
        .describe('Resource name of the contact group (e.g., "contactGroups/abc123")'),
      etag: z
        .string()
        .optional()
        .describe(
          'ETag/fingerprint for concurrency control. Omit to use the latest server copy.'
        ),
      name: z.string().describe('New name for the contact group'),
      clientData: z
        .array(customFieldSchema)
        .optional()
        .describe('Updated key-value pairs for client-specific data')
    })
  )
  .output(contactGroupSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let etag = ctx.input.etag;

    if (!etag) {
      let current = await client.getContactGroup(ctx.input.resourceName);
      etag = current.etag;
    }

    let result = await client.updateContactGroup(
      ctx.input.resourceName,
      ctx.input.name,
      etag,
      ctx.input.clientData
    );
    let group = formatContactGroup(result);

    return {
      output: group,
      message: `Updated contact group to **${ctx.input.name}** (${ctx.input.resourceName}).`
    };
  })
  .build();

export let deleteContactGroup = SlateTool.create(spec, {
  name: 'Delete Contact Group',
  key: 'delete_contact_group',
  description: `Deletes a user-defined contact group. Optionally also deletes the contacts that are members of the group. System contact groups cannot be deleted.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(googleContactsActionScopes.deleteContactGroup)
  .input(
    z.object({
      resourceName: z
        .string()
        .describe(
          'Resource name of the contact group to delete (e.g., "contactGroups/abc123")'
        ),
      deleteContacts: z
        .boolean()
        .optional()
        .describe('If true, also deletes the contacts in the group (default false)')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the group was successfully deleted'),
      resourceName: z.string().describe('Resource name of the deleted group')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteContactGroup(ctx.input.resourceName, ctx.input.deleteContacts);

    return {
      output: {
        deleted: true,
        resourceName: ctx.input.resourceName
      },
      message: `Deleted contact group **${ctx.input.resourceName}**${ctx.input.deleteContacts ? ' along with its contacts' : ''}.`
    };
  })
  .build();
