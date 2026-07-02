import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import {
  addressInputSchema,
  cleanBody,
  companySlugFor,
  companySlugInput,
  contactSchema,
  createClient,
  listMetadata,
  mapContact,
  paginationInputShape,
  paginationOutputShape,
  paginationParams
} from './shared';

let contactSortSchema = z.enum([
  'lastModified asc',
  'lastModified desc',
  'createdDate asc',
  'createdDate desc'
]);

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description:
    'Lists Fiken contacts for a company, with filters for customer/supplier status, identity fields, exact dates, and inclusive created/modified date ranges.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companySlug: companySlugInput,
      page: paginationInputShape.page,
      pageSize: paginationInputShape.pageSize,
      name: z.string().optional().describe('Exact contact name filter.'),
      email: z.string().optional().describe('Exact email filter.'),
      organizationNumber: z.string().optional(),
      customerNumber: z.number().int().optional(),
      supplierNumber: z.number().int().optional(),
      memberNumberString: z.string().optional(),
      phoneNumber: z.string().optional(),
      customer: z.boolean().optional().describe('Return contacts marked as customers.'),
      supplier: z.boolean().optional().describe('Return contacts marked as suppliers.'),
      inactive: z.boolean().optional().describe('Return inactive contacts when true.'),
      group: z.string().optional().describe('Exact contact group name.'),
      createdDate: z.string().optional().describe('Exact created date, YYYY-MM-DD.'),
      createdDateFrom: z.string().optional().describe('Created on or after this date.'),
      createdDateTo: z.string().optional().describe('Created on or before this date.'),
      lastModified: z.string().optional().describe('Exact last modified date, YYYY-MM-DD.'),
      lastModifiedFrom: z.string().optional().describe('Modified on or after this date.'),
      lastModifiedTo: z.string().optional().describe('Modified on or before this date.'),
      sortBy: contactSortSchema.optional()
    })
  )
  .output(
    z.object({
      companySlug: z.string(),
      contacts: z.array(contactSchema),
      ...paginationOutputShape
    })
  )
  .handleInvocation(async ctx => {
    let companySlug = companySlugFor(ctx, ctx.input.companySlug);
    let client = createClient(ctx);
    let response = await client.listContacts(
      companySlug,
      pickDefined({
        ...paginationParams(ctx.input),
        name: ctx.input.name,
        email: ctx.input.email,
        organizationNumber: ctx.input.organizationNumber,
        customerNumber: ctx.input.customerNumber,
        supplierNumber: ctx.input.supplierNumber,
        memberNumberString: ctx.input.memberNumberString,
        phoneNumber: ctx.input.phoneNumber,
        customer: ctx.input.customer,
        supplier: ctx.input.supplier,
        inactive: ctx.input.inactive,
        group: ctx.input.group,
        createdDate: ctx.input.createdDate,
        createdDateGe: ctx.input.createdDateFrom,
        createdDateLe: ctx.input.createdDateTo,
        lastModified: ctx.input.lastModified,
        lastModifiedGe: ctx.input.lastModifiedFrom,
        lastModifiedLe: ctx.input.lastModifiedTo,
        sortBy: ctx.input.sortBy
      })
    );
    let contacts = response.items.map(mapContact);

    return {
      output: {
        companySlug,
        contacts,
        ...listMetadata(response)
      },
      message: `Found **${contacts.length}** Fiken contact${contacts.length === 1 ? '' : 's'}.`
    };
  })
  .build();

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: 'Retrieves one Fiken contact by contact id.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companySlug: companySlugInput,
      contactId: z.number().int().positive().describe('Fiken contact id.')
    })
  )
  .output(
    z.object({
      companySlug: z.string(),
      contact: contactSchema
    })
  )
  .handleInvocation(async ctx => {
    let companySlug = companySlugFor(ctx, ctx.input.companySlug);
    let client = createClient(ctx);
    let contact = mapContact(await client.getContact(companySlug, ctx.input.contactId));

    return {
      output: {
        companySlug,
        contact
      },
      message: `Retrieved Fiken contact **${contact.name ?? ctx.input.contactId}**.`
    };
  })
  .build();

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description:
    'Creates a Fiken contact for a company. Mark the contact as customer and/or supplier when it will be used for invoices, sales, or purchases.',
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      companySlug: companySlugInput,
      name: z.string().min(1).max(200).describe('Contact name.'),
      email: z.string().max(200).optional(),
      organizationNumber: z.string().max(200).optional(),
      phoneNumber: z.string().max(20).optional(),
      memberNumberString: z.string().optional(),
      customer: z.boolean().optional().describe('Set true when this contact is a customer.'),
      supplier: z.boolean().optional().describe('Set true when this contact is a supplier.'),
      bankAccountNumber: z.string().max(11).optional(),
      currency: z
        .string()
        .regex(/^[A-Z]{3}$/)
        .optional()
        .describe('Uppercase ISO 4217 currency code.'),
      language: z.enum(['NORWEGIAN', 'ENGLISH']).optional(),
      inactive: z.boolean().optional(),
      daysUntilInvoicingDueDate: z.number().int().optional(),
      discount: z.number().min(0).max(100).optional(),
      address: addressInputSchema.optional(),
      groups: z.array(z.string()).optional()
    })
  )
  .output(
    z.object({
      companySlug: z.string(),
      contactId: z.number().optional(),
      location: z.string().optional(),
      contact: contactSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let companySlug = companySlugFor(ctx, ctx.input.companySlug);
    let client = createClient(ctx);
    let created = await client.createContact(
      companySlug,
      cleanBody({
        name: ctx.input.name,
        email: ctx.input.email,
        organizationNumber: ctx.input.organizationNumber,
        phoneNumber: ctx.input.phoneNumber,
        memberNumberString: ctx.input.memberNumberString,
        customer: ctx.input.customer,
        supplier: ctx.input.supplier,
        bankAccountNumber: ctx.input.bankAccountNumber,
        currency: ctx.input.currency,
        language: ctx.input.language,
        inactive: ctx.input.inactive,
        daysUntilInvoicingDueDate: ctx.input.daysUntilInvoicingDueDate,
        discount: ctx.input.discount,
        address: ctx.input.address,
        groups: ctx.input.groups
      })
    );
    let contact = created.record ? mapContact(created.record) : undefined;

    return {
      output: {
        companySlug,
        contactId: contact?.contactId ?? created.id,
        location: created.location,
        contact
      },
      message: `Created Fiken contact **${contact?.name ?? ctx.input.name}**.`
    };
  })
  .build();
