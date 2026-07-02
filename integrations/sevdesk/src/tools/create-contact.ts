import { SlateTool } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

let communicationWaySchema = z
  .object({
    type: z
      .enum(['EMAIL', 'PHONE', 'WEB', 'MOBILE', 'FAX'])
      .describe('Type of communication way'),
    value: z.string().describe('The value (e.g. email address, phone number, URL)'),
    key: z
      .enum(['1', '2', '3', '4', '5'])
      .optional()
      .describe('Key: 1=Private, 2=Work, 3=Fax, 4=Mobile, 5=Newsletter/Invoice')
  })
  .describe('Communication way to add to the contact');

let addressSchema = z
  .object({
    street: z.string().optional().describe('Street name and number'),
    zip: z.string().optional().describe('ZIP/postal code'),
    city: z.string().optional().describe('City name'),
    country: z
      .string()
      .optional()
      .describe('Country ID (sevDesk country ID, e.g. 1 for Germany)'),
    category: z.string().optional().describe('Address category ID')
  })
  .describe('Address to add to the contact');

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact (customer, supplier, or other) in sevDesk. Supports creating both person and company contacts with optional addresses and communication ways (email, phone, etc.).`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactType: z
        .enum(['person', 'company'])
        .describe('Whether this is a person or company contact'),
      familyName: z
        .string()
        .optional()
        .describe('Family/last name (required for person contacts)'),
      firstName: z.string().optional().describe('First/given name (for person contacts)'),
      companyName: z
        .string()
        .optional()
        .describe('Company name (required for company contacts)'),
      categoryId: z.string().describe('Category ID: 3=Customer, 2=Supplier, etc.'),
      customerNumber: z
        .string()
        .optional()
        .describe('Custom customer number. If omitted, auto-generated.'),
      description: z.string().optional().describe('Description or notes for the contact'),
      vatNumber: z.string().optional().describe('VAT identification number'),
      gender: z
        .enum(['m', 'w', ''])
        .optional()
        .describe('Gender: m=male, w=female, empty=not specified'),
      academicTitle: z.string().optional().describe('Academic title (e.g. Dr., Prof.)'),
      parentContactId: z
        .string()
        .optional()
        .describe('ID of parent contact (for linking person to company)'),
      addresses: z.array(addressSchema).optional().describe('Addresses to add to the contact'),
      communicationWays: z
        .array(communicationWaySchema)
        .optional()
        .describe('Communication ways to add (email, phone, etc.)')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the created contact'),
      customerNumber: z.string().optional().describe('Assigned customer number'),
      name: z.string().optional().describe('Display name of the contact')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SevdeskClient({ token: ctx.auth.token });

    let contactData: Record<string, any> = {
      category: { id: ctx.input.categoryId, objectName: 'Category' }
    };

    if (ctx.input.contactType === 'person') {
      contactData.familyname = ctx.input.familyName;
      if (ctx.input.firstName) contactData.surename = ctx.input.firstName;
    } else {
      contactData.name = ctx.input.companyName;
    }

    if (ctx.input.customerNumber) contactData.customerNumber = ctx.input.customerNumber;
    if (ctx.input.description) contactData.description = ctx.input.description;
    if (ctx.input.vatNumber) contactData.vatNumber = ctx.input.vatNumber;
    if (ctx.input.gender !== undefined) contactData.gender = ctx.input.gender;
    if (ctx.input.academicTitle) contactData.academicTitle = ctx.input.academicTitle;
    if (ctx.input.parentContactId) {
      contactData.parent = { id: ctx.input.parentContactId, objectName: 'Contact' };
    }

    let contact = await client.createContact(contactData);
    let contactId = String(contact.id);
    let displayName =
      contact.name ||
      [ctx.input.firstName, ctx.input.familyName].filter(Boolean).join(' ') ||
      ctx.input.companyName ||
      '';

    if (ctx.input.addresses?.length) {
      for (let addr of ctx.input.addresses) {
        await client.createContactAddress({
          contact: { id: contactId, objectName: 'Contact' },
          street: addr.street,
          zip: addr.zip,
          city: addr.city,
          country: addr.country
            ? { id: addr.country, objectName: 'StaticCountry' }
            : undefined,
          category: addr.category ? { id: addr.category, objectName: 'Category' } : undefined
        });
      }
    }

    if (ctx.input.communicationWays?.length) {
      for (let cw of ctx.input.communicationWays) {
        await client.createCommunicationWay({
          contact: { id: contactId, objectName: 'Contact' },
          type: cw.type,
          value: cw.value,
          key: cw.key ? Number.parseInt(cw.key, 10) : 2
        });
      }
    }

    return {
      output: {
        contactId,
        customerNumber: contact.customerNumber ?? undefined,
        name: displayName
      },
      message: `Created contact **${displayName}** (ID: ${contactId}).`
    };
  })
  .build();
