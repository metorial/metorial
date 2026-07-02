import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactFields = z
  .object({
    firstName: z.string().optional().describe('First name'),
    lastName: z.string().optional().describe('Last name'),
    accountId: z.number().optional().describe('Associated account/company ID'),
    typeId: z.number().optional().describe('Contact type ID'),
    phone1: z.string().optional().describe('Primary phone number'),
    phone2: z.string().optional().describe('Secondary phone number'),
    fax: z.string().optional().describe('Fax number'),
    email: z.string().optional().describe('Primary email'),
    email2: z.string().optional().describe('Secondary email'),
    email3: z.string().optional().describe('Tertiary email'),
    salesRepId: z.number().optional().describe('Assigned sales rep ID'),
    comment: z.string().optional().describe('Comments or notes'),
    address1: z.string().optional().describe('Address line'),
    city: z.string().optional().describe('City'),
    postcode: z.string().optional().describe('Postal code'),
    region: z.string().optional().describe('Region or state'),
    countryId: z.number().optional().describe('Country ID'),
    birthday: z.string().optional().describe('Birthday (ISO 8601 format)'),
    linkedin: z.string().optional().describe('LinkedIn profile URL'),
    skype: z.string().optional().describe('Skype username'),
    gender: z.string().optional().describe('Gender'),
    useCompanyAddress: z
      .boolean()
      .optional()
      .describe('Use the company address for this contact'),
    marketingCommunications: z
      .boolean()
      .optional()
      .describe('Opted in for marketing communications'),
    extId: z.string().optional().describe('External system ID for synchronization')
  })
  .describe('Contact fields to set');

export let manageContact = SlateTool.create(spec, {
  name: 'Manage Contact',
  key: 'manage_contact',
  description: `Create, update, or delete contact records in ForceManager.
Contacts are associated with accounts and include personal details, phone numbers, emails, and social profiles.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      contactId: z.number().optional().describe('Contact ID (required for update and delete)'),
      fields: contactFields
        .optional()
        .describe('Contact fields (required for create, optional for update)')
    })
  )
  .output(
    z.object({
      contactId: z.number().optional().describe('ID of the affected contact'),
      message: z.string().optional().describe('Status message'),
      contact: z.any().optional().describe('Full contact record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    if (ctx.input.action === 'create') {
      if (!ctx.input.fields) {
        throw new Error('Fields are required for creating a contact');
      }
      let result = await client.createContact(ctx.input.fields);
      let contactId = result?.id;
      let contact = contactId ? await client.getContact(contactId) : result;
      return {
        output: { contactId, message: 'Contact created successfully', contact },
        message: `Created contact **${ctx.input.fields.firstName || ''} ${ctx.input.fields.lastName || ''}** (ID: ${contactId})`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.contactId) {
        throw new Error('contactId is required for updating a contact');
      }
      await client.updateContact(ctx.input.contactId, ctx.input.fields || {});
      let contact = await client.getContact(ctx.input.contactId);
      return {
        output: {
          contactId: ctx.input.contactId,
          message: 'Contact updated successfully',
          contact
        },
        message: `Updated contact ID **${ctx.input.contactId}**`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.contactId) {
        throw new Error('contactId is required for deleting a contact');
      }
      await client.deleteContact(ctx.input.contactId);
      return {
        output: { contactId: ctx.input.contactId, message: 'Contact deleted successfully' },
        message: `Deleted contact ID **${ctx.input.contactId}**`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
