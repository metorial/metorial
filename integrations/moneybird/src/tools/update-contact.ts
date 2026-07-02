import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoneybirdClient } from '../lib/client';
import { spec } from '../spec';

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact in Moneybird. Only provided fields will be updated. Can also archive or delete the contact.`,
  instructions: [
    'To clear an optional field, pass an empty string.',
    'Set "archive" to true to archive the contact, or "delete" to true to permanently delete it.'
  ]
})
  .input(
    z.object({
      contactId: z.string().describe('Moneybird contact ID to update'),
      companyName: z.string().optional().describe('Company name'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      address1: z.string().optional().describe('Address line 1'),
      address2: z.string().optional().describe('Address line 2'),
      zipcode: z.string().optional().describe('Zip/postal code'),
      city: z.string().optional().describe('City'),
      country: z.string().optional().describe('2-letter country code'),
      taxNumber: z.string().optional().describe('Tax/VAT number'),
      deliveryMethod: z
        .enum(['Email', 'Post', 'Manual', 'Simplerinvoicing', 'Peppol'])
        .optional()
        .describe('Invoice delivery method'),
      archive: z.boolean().optional().describe('Set to true to archive the contact'),
      remove: z.boolean().optional().describe('Set to true to permanently delete the contact')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Updated contact ID'),
      companyName: z.string().nullable(),
      firstName: z.string().nullable(),
      lastName: z.string().nullable(),
      email: z.string().nullable(),
      archived: z.boolean(),
      deleted: z.boolean().describe('Whether the contact was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoneybirdClient({
      token: ctx.auth.token,
      administrationId: ctx.config.administrationId
    });

    if (ctx.input.remove) {
      await client.deleteContact(ctx.input.contactId);
      return {
        output: {
          contactId: ctx.input.contactId,
          companyName: null,
          firstName: null,
          lastName: null,
          email: null,
          archived: false,
          deleted: true
        },
        message: `Deleted contact ${ctx.input.contactId}.`
      };
    }

    if (ctx.input.archive) {
      await client.archiveContact(ctx.input.contactId);
      let contact = await client.getContact(ctx.input.contactId);
      return {
        output: {
          contactId: String(contact.id),
          companyName: contact.company_name || null,
          firstName: contact.firstname || null,
          lastName: contact.lastname || null,
          email: contact.email || null,
          archived: true,
          deleted: false
        },
        message: `Archived contact ${contact.company_name || contact.firstname || ctx.input.contactId}.`
      };
    }

    let contactData: Record<string, any> = {};
    if (ctx.input.companyName !== undefined) contactData.company_name = ctx.input.companyName;
    if (ctx.input.firstName !== undefined) contactData.firstname = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) contactData.lastname = ctx.input.lastName;
    if (ctx.input.email !== undefined) contactData.email = ctx.input.email;
    if (ctx.input.phone !== undefined) contactData.phone = ctx.input.phone;
    if (ctx.input.address1 !== undefined) contactData.address1 = ctx.input.address1;
    if (ctx.input.address2 !== undefined) contactData.address2 = ctx.input.address2;
    if (ctx.input.zipcode !== undefined) contactData.zipcode = ctx.input.zipcode;
    if (ctx.input.city !== undefined) contactData.city = ctx.input.city;
    if (ctx.input.country !== undefined) contactData.country = ctx.input.country;
    if (ctx.input.taxNumber !== undefined) contactData.tax_number = ctx.input.taxNumber;
    if (ctx.input.deliveryMethod !== undefined)
      contactData.delivery_method = ctx.input.deliveryMethod;

    let contact = await client.updateContact(ctx.input.contactId, contactData);

    let name =
      contact.company_name || `${contact.firstname || ''} ${contact.lastname || ''}`.trim();
    return {
      output: {
        contactId: String(contact.id),
        companyName: contact.company_name || null,
        firstName: contact.firstname || null,
        lastName: contact.lastname || null,
        email: contact.email || null,
        archived: contact.archived || false,
        deleted: false
      },
      message: `Updated contact **${name}**.`
    };
  });
