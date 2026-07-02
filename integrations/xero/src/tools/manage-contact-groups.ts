import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let contactGroupContactSchema = z.object({
  contactId: z.string().optional().describe('Contact ID'),
  name: z.string().optional().describe('Contact name')
});

let contactGroupOutputSchema = z.object({
  contactGroupId: z.string().optional().describe('Unique Xero contact group ID'),
  name: z.string().optional().describe('Contact group name'),
  status: z.string().optional().describe('Contact group status: ACTIVE or DELETED'),
  contacts: z
    .array(contactGroupContactSchema)
    .optional()
    .describe('Contacts in the group when returned by Xero'),
  contactCount: z.number().optional().describe('Number of contacts returned with the group')
});

let mapContactGroup = (group: any) => {
  let contacts = group.Contacts?.map((contact: any) => ({
    contactId: contact.ContactID,
    name: contact.Name
  }));

  return {
    contactGroupId: group.ContactGroupID,
    name: group.Name,
    status: group.Status,
    contacts,
    contactCount: contacts?.length
  };
};

export let listContactGroups = SlateTool.create(spec, {
  name: 'List Contact Groups',
  key: 'list_contact_groups',
  description: `Lists active Xero contact groups. Contact groups let users segment customers and suppliers for invoicing, reporting, and communication workflows.`,
  instructions: ['Use where for advanced filters, e.g. `Status=="ACTIVE"`'],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      where: z.string().optional().describe('Xero API where filter expression'),
      order: z.string().optional().describe('Order results, e.g. "Name ASC"')
    })
  )
  .output(
    z.object({
      contactGroups: z.array(contactGroupOutputSchema).describe('List of contact groups'),
      count: z.number().describe('Number of contact groups returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    let result = await client.getContactGroups({
      where: ctx.input.where,
      order: ctx.input.order
    });
    let contactGroups = (result.ContactGroups || []).map(mapContactGroup);

    return {
      output: { contactGroups, count: contactGroups.length },
      message: `Found **${contactGroups.length}** contact group(s).`
    };
  })
  .build();

export let getContactGroup = SlateTool.create(spec, {
  name: 'Get Contact Group',
  key: 'get_contact_group',
  description: `Retrieves a single Xero contact group by ID, including the contacts returned by Xero for that group.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      contactGroupId: z.string().describe('The Xero contact group ID')
    })
  )
  .output(contactGroupOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    let group = await client.getContactGroup(ctx.input.contactGroupId);
    let output = mapContactGroup(group);

    return {
      output,
      message: `Retrieved contact group **${output.name || output.contactGroupId}** with **${output.contactCount || 0}** contact(s).`
    };
  })
  .build();

export let createContactGroup = SlateTool.create(spec, {
  name: 'Create Contact Group',
  key: 'create_contact_group',
  description: `Creates a new Xero contact group for segmenting contacts.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      name: z.string().describe('Contact group name')
    })
  )
  .output(contactGroupOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    let group = await client.createContactGroup({ Name: ctx.input.name });
    let output = mapContactGroup(group);

    return {
      output,
      message: `Created contact group **${output.name || output.contactGroupId}**.`
    };
  })
  .build();

export let updateContactGroup = SlateTool.create(spec, {
  name: 'Update Contact Group',
  key: 'update_contact_group',
  description: `Updates a Xero contact group name or status. Set status to DELETED to delete a group.`,
  instructions: ['Only active contact groups are returned by Xero list/get responses'],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      contactGroupId: z.string().describe('The Xero contact group ID to update'),
      name: z.string().optional().describe('Updated contact group name'),
      status: z.enum(['ACTIVE', 'DELETED']).optional().describe('Updated group status')
    })
  )
  .output(contactGroupOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    let group = await client.updateContactGroup(ctx.input.contactGroupId, {
      Name: ctx.input.name,
      Status: ctx.input.status
    });
    let output = mapContactGroup(group);

    return {
      output,
      message: `Updated contact group **${output.name || output.contactGroupId}**${ctx.input.status ? ` — Status: **${ctx.input.status}**` : ''}.`
    };
  })
  .build();

export let addContactsToContactGroup = SlateTool.create(spec, {
  name: 'Add Contacts To Contact Group',
  key: 'add_contacts_to_contact_group',
  description: `Adds one or more existing Xero contacts to a contact group.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      contactGroupId: z.string().describe('The Xero contact group ID'),
      contactIds: z.array(z.string()).min(1).describe('Contact IDs to add to the group')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactGroupContactSchema).describe('Contacts added to the group'),
      count: z.number().describe('Number of contacts added')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    let result = await client.addContactsToContactGroup(
      ctx.input.contactGroupId,
      ctx.input.contactIds
    );
    let contacts = (result.Contacts || []).map(contact => ({
      contactId: contact.ContactID,
      name: contact.Name
    }));

    return {
      output: { contacts, count: contacts.length },
      message: `Added **${contacts.length}** contact(s) to contact group **${ctx.input.contactGroupId}**.`
    };
  })
  .build();

export let removeContactFromContactGroup = SlateTool.create(spec, {
  name: 'Remove Contact From Contact Group',
  key: 'remove_contact_from_contact_group',
  description: `Removes a single contact from a Xero contact group.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      contactGroupId: z.string().describe('The Xero contact group ID'),
      contactId: z.string().describe('Contact ID to remove from the group')
    })
  )
  .output(
    z.object({
      contactGroupId: z.string().describe('The Xero contact group ID'),
      contactId: z.string().describe('The removed contact ID'),
      removed: z.boolean().describe('Whether the contact removal request succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    await client.removeContactFromContactGroup(ctx.input.contactGroupId, ctx.input.contactId);

    return {
      output: {
        contactGroupId: ctx.input.contactGroupId,
        contactId: ctx.input.contactId,
        removed: true
      },
      message: `Removed contact **${ctx.input.contactId}** from contact group **${ctx.input.contactGroupId}**.`
    };
  })
  .build();
