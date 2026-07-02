import { SlateTool } from 'slates';
import { z } from 'zod';
import { HubSpotClient } from '../lib/client';
import { hubSpotActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let contactPropertySchema = z
  .record(z.string(), z.any())
  .describe(
    'Contact properties as key-value pairs (e.g., email, firstname, lastname, phone, company, website, lifecyclestage)'
  );

let contactOutputSchema = z.object({
  contactId: z.string().describe('HubSpot contact ID'),
  properties: z.record(z.string(), z.any()).describe('Contact properties'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last updated timestamp'),
  archived: z.boolean().optional().describe('Whether the contact is archived')
});

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact in HubSpot CRM. Provide contact properties such as email, firstname, lastname, phone, company, and any custom properties defined in your HubSpot account.`,
  tags: { destructive: false, readOnly: false }
})
  .scopes(hubSpotActionScopes.createContact)
  .input(
    z.object({
      properties: contactPropertySchema,
      associations: z
        .array(
          z.object({
            to: z.object({ id: z.string().describe('ID of the object to associate with') }),
            types: z.array(
              z.object({
                associationCategory: z
                  .string()
                  .describe('Association category (e.g., HUBSPOT_DEFINED)'),
                associationTypeId: z.number().describe('Association type ID')
              })
            )
          })
        )
        .optional()
        .describe('Associations to create with the contact')
    })
  )
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.createObject(
      'contacts',
      ctx.input.properties,
      ctx.input.associations
    );

    return {
      output: {
        contactId: result.id,
        properties: result.properties,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        archived: result.archived
      },
      message: `Created contact **${result.properties.firstname || ''} ${result.properties.lastname || ''}** (ID: ${result.id})`
    };
  })
  .build();

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a contact from HubSpot CRM by ID. Optionally specify which properties to return and which associated objects to include.`,
  tags: { readOnly: true }
})
  .scopes(hubSpotActionScopes.getContact)
  .input(
    z.object({
      contactId: z.string().describe('HubSpot contact ID'),
      properties: z.array(z.string()).optional().describe('Specific properties to return'),
      associations: z
        .array(z.string())
        .optional()
        .describe('Associated object types to include (e.g., companies, deals)')
    })
  )
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.getObject(
      'contacts',
      ctx.input.contactId,
      ctx.input.properties,
      ctx.input.associations
    );

    return {
      output: {
        contactId: result.id,
        properties: result.properties,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        archived: result.archived
      },
      message: `Retrieved contact **${result.properties.firstname || ''} ${result.properties.lastname || ''}** (ID: ${result.id})`
    };
  })
  .build();

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact's properties in HubSpot CRM. Only the provided properties will be updated; other properties remain unchanged.`,
  tags: { destructive: false, readOnly: false }
})
  .scopes(hubSpotActionScopes.updateContact)
  .input(
    z.object({
      contactId: z.string().describe('HubSpot contact ID to update'),
      properties: contactPropertySchema
    })
  )
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.updateObject(
      'contacts',
      ctx.input.contactId,
      ctx.input.properties
    );

    return {
      output: {
        contactId: result.id,
        properties: result.properties,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        archived: result.archived
      },
      message: `Updated contact (ID: ${result.id})`
    };
  })
  .build();

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Contact',
  key: 'delete_contact',
  description: `Archive (soft delete) a contact in HubSpot CRM. The contact can be restored later from the recycling bin.`,
  tags: { destructive: true, readOnly: false }
})
  .scopes(hubSpotActionScopes.deleteContact)
  .input(
    z.object({
      contactId: z.string().describe('HubSpot contact ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    await client.deleteObject('contacts', ctx.input.contactId);

    return {
      output: { success: true },
      message: `Archived contact (ID: ${ctx.input.contactId})`
    };
  })
  .build();

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List contacts from HubSpot CRM with pagination support. Returns a page of contacts with their properties.`,
  tags: { readOnly: true }
})
  .scopes(hubSpotActionScopes.listContacts)
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of contacts to return (max 100)'),
      after: z.string().optional().describe('Pagination cursor for the next page'),
      properties: z.array(z.string()).optional().describe('Specific properties to return')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactOutputSchema).describe('List of contacts'),
      hasMore: z.boolean().describe('Whether more results are available'),
      nextCursor: z.string().optional().describe('Cursor for fetching the next page'),
      total: z.number().optional().describe('Total number of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.listObjects(
      'contacts',
      ctx.input.limit || 10,
      ctx.input.after,
      ctx.input.properties
    );

    let contacts = (result.results || []).map((r: any) => ({
      contactId: r.id,
      properties: r.properties,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      archived: r.archived
    }));

    return {
      output: {
        contacts,
        hasMore: !!result.paging?.next?.after,
        nextCursor: result.paging?.next?.after,
        total: result.total
      },
      message: `Retrieved **${contacts.length}** contacts${result.paging?.next?.after ? ' (more available)' : ''}`
    };
  })
  .build();
