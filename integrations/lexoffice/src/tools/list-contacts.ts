import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactSummarySchema = z
  .object({
    id: z.string().describe('Unique contact ID'),
    organizationId: z.string().optional().describe('Organization ID this contact belongs to'),
    version: z.number().optional().describe('Resource version for optimistic locking'),
    roles: z
      .object({
        customer: z
          .object({
            number: z.number().optional().describe('Customer number')
          })
          .optional()
          .describe('Customer role details'),
        vendor: z
          .object({
            number: z.number().optional().describe('Vendor number')
          })
          .optional()
          .describe('Vendor role details')
      })
      .optional()
      .describe('Assigned roles'),
    company: z
      .object({
        name: z.string().optional().describe('Company name'),
        taxNumber: z.string().optional().describe('Tax number'),
        vatRegistrationId: z.string().optional().describe('VAT registration ID'),
        allowTaxFreeInvoices: z
          .boolean()
          .optional()
          .describe('Whether tax-free invoices are allowed'),
        contactPersons: z
          .array(
            z.object({
              salutation: z.string().optional(),
              firstName: z.string().optional(),
              lastName: z.string().optional(),
              primary: z.boolean().optional(),
              emailAddress: z.string().optional(),
              phoneNumber: z.string().optional()
            })
          )
          .optional()
          .describe('Contact persons at the company')
      })
      .optional()
      .describe('Company details (present if contact is a company)'),
    person: z
      .object({
        salutation: z.string().optional().describe('Salutation'),
        firstName: z.string().optional().describe('First name'),
        lastName: z.string().optional().describe('Last name')
      })
      .optional()
      .describe('Person details (present if contact is a person)'),
    archived: z.boolean().optional().describe('Whether the contact is archived'),
    note: z.string().optional().describe('Free-text note'),
    addresses: z
      .object({
        billing: z
          .array(
            z.object({
              supplement: z.string().optional(),
              street: z.string().optional(),
              zip: z.string().optional(),
              city: z.string().optional(),
              countryCode: z.string().optional()
            })
          )
          .optional(),
        shipping: z
          .array(
            z.object({
              supplement: z.string().optional(),
              street: z.string().optional(),
              zip: z.string().optional(),
              city: z.string().optional(),
              countryCode: z.string().optional()
            })
          )
          .optional()
      })
      .optional()
      .describe('Contact addresses'),
    emailAddresses: z
      .object({
        business: z.array(z.string()).optional(),
        office: z.array(z.string()).optional(),
        private: z.array(z.string()).optional(),
        other: z.array(z.string()).optional()
      })
      .optional()
      .describe('Email addresses'),
    phoneNumbers: z
      .object({
        business: z.array(z.string()).optional(),
        office: z.array(z.string()).optional(),
        mobile: z.array(z.string()).optional(),
        private: z.array(z.string()).optional(),
        fax: z.array(z.string()).optional(),
        other: z.array(z.string()).optional()
      })
      .optional()
      .describe('Phone numbers')
  })
  .describe('Contact summary');

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Lists and filters contacts in Lexoffice. Supports filtering by email, name, contact number, and role (customer or vendor). Returns paginated results with full contact details.`,
  constraints: [
    'Results are paginated with a default page size of 25.',
    'Filters are optional and can be combined.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter contacts by email address'),
      name: z
        .string()
        .optional()
        .describe('Filter contacts by name (company name or person name)'),
      number: z.number().optional().describe('Filter contacts by customer or vendor number'),
      customer: z.boolean().optional().describe('Filter to only customer contacts'),
      vendor: z.boolean().optional().describe('Filter to only vendor contacts'),
      page: z.number().optional().describe('Page number (0-based, default: 0)')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(contactSummarySchema)
        .describe('List of contacts matching the filters'),
      totalPages: z.number().describe('Total number of pages available'),
      totalElements: z.number().describe('Total number of contacts matching the filters'),
      currentPage: z.number().describe('Current page number (0-based)'),
      numberOfElements: z.number().describe('Number of contacts on the current page'),
      first: z.boolean().describe('Whether this is the first page'),
      last: z.boolean().describe('Whether this is the last page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listContacts({
      email: ctx.input.email,
      name: ctx.input.name,
      number: ctx.input.number,
      customer: ctx.input.customer,
      vendor: ctx.input.vendor,
      page: ctx.input.page
    });

    let contacts = (result.content || []).map((c: any) => ({
      id: c.id,
      organizationId: c.organizationId,
      version: c.version,
      roles: c.roles,
      company: c.company,
      person: c.person,
      archived: c.archived,
      note: c.note,
      addresses: c.addresses,
      emailAddresses: c.emailAddresses,
      phoneNumbers: c.phoneNumbers
    }));

    let totalPages = result.totalPages ?? 0;
    let totalElements = result.totalElements ?? 0;
    let currentPage = result.number ?? 0;
    let numberOfElements = result.numberOfElements ?? contacts.length;

    let filtersApplied: string[] = [];
    if (ctx.input.email) filtersApplied.push(`email="${ctx.input.email}"`);
    if (ctx.input.name) filtersApplied.push(`name="${ctx.input.name}"`);
    if (ctx.input.number !== undefined) filtersApplied.push(`number=${ctx.input.number}`);
    if (ctx.input.customer) filtersApplied.push('customers only');
    if (ctx.input.vendor) filtersApplied.push('vendors only');

    let filterSummary =
      filtersApplied.length > 0 ? ` (filtered by ${filtersApplied.join(', ')})` : '';

    return {
      output: {
        contacts,
        totalPages,
        totalElements,
        currentPage,
        numberOfElements,
        first: result.first ?? currentPage === 0,
        last: result.last ?? currentPage >= totalPages - 1
      },
      message: `Found **${totalElements}** contact(s)${filterSummary} -- showing page ${currentPage + 1} of ${totalPages}.`
    };
  })
  .build();
