import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieves a contact's full details including custom field values, tags, list subscriptions, and deal associations. Can look up by contact ID or search by email.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.string().optional().describe('ID of the contact to retrieve'),
      email: z
        .string()
        .optional()
        .describe('Email address to search for (used if contactId is not provided)')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the contact'),
      email: z.string().describe('Email address'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      phone: z.string().optional().describe('Phone number'),
      createdAt: z.string().optional().describe('Date the contact was created'),
      updatedAt: z.string().optional().describe('Date the contact was last updated'),
      tags: z
        .array(
          z.object({
            contactTagId: z.string(),
            tagId: z.string()
          })
        )
        .optional()
        .describe('Tags associated with the contact'),
      fieldValues: z
        .array(
          z.object({
            fieldId: z.string(),
            value: z.string()
          })
        )
        .optional()
        .describe('Custom field values'),
      lists: z
        .array(
          z.object({
            listId: z.string(),
            status: z.string()
          })
        )
        .optional()
        .describe('List subscriptions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    let contactId = ctx.input.contactId;

    if (!contactId && ctx.input.email) {
      let searchResult = await client.listContacts({ email: ctx.input.email, limit: 1 });
      if (searchResult.contacts && searchResult.contacts.length > 0) {
        contactId = searchResult.contacts[0].id;
      } else {
        throw new Error(`No contact found with email: ${ctx.input.email}`);
      }
    }

    if (!contactId) {
      throw new Error('Either contactId or email must be provided');
    }

    let result = await client.getContact(contactId);
    let contact = result.contact;

    let tagsResult = await client.getContactTags(contactId);
    let tags = (tagsResult.contactTags || []).map((ct: any) => ({
      contactTagId: ct.id,
      tagId: ct.tag
    }));

    let fieldValuesResult = await client.getContactFieldValues(contactId);
    let fieldValues = (fieldValuesResult.fieldValues || []).map((fv: any) => ({
      fieldId: fv.field,
      value: fv.value
    }));

    let listsResult = await client.getContactLists(contactId);
    let lists = (listsResult.contactLists || []).map((cl: any) => ({
      listId: cl.list,
      status: String(cl.status)
    }));

    return {
      output: {
        contactId: contact.id,
        email: contact.email,
        firstName: contact.firstName || undefined,
        lastName: contact.lastName || undefined,
        phone: contact.phone || undefined,
        createdAt: contact.cdate || undefined,
        updatedAt: contact.udate || undefined,
        tags,
        fieldValues,
        lists
      },
      message: `Retrieved contact **${contact.email}** (ID: ${contact.id}).`
    };
  })
  .build();
