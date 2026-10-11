import { SlateTool } from 'slates';
import { z } from 'zod';
import { HelpScoutClient, type HelpScoutPatchOperation } from '../lib/client';
import { helpscoutServiceError } from '../lib/errors';
import { halPageInfo } from '../lib/pagination';
import { spec } from '../spec';

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: `Search and list customer profiles. Filter by email, name, mailbox, or modification time, and optionally add an advanced search query. All filters are combined with AND. Results are paginated (50 per page).`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter by customer email address'),
      firstName: z.string().optional().describe('Filter by first name'),
      lastName: z.string().optional().describe('Filter by last name'),
      mailboxId: z
        .number()
        .optional()
        .describe('Filter by mailbox ID. Call list_mailboxes to discover mailbox IDs.'),
      modifiedSince: z
        .string()
        .optional()
        .describe('Only return customers modified after this ISO 8601 timestamp'),
      query: z
        .string()
        .optional()
        .describe(
          'Advanced search query in Help Scout query syntax, e.g. (firstName:"John" OR firstName:"Johnny"). Combined with the other filters using AND.'
        ),
      sortField: z
        .string()
        .optional()
        .describe('Field to sort by: createdAt (default), firstName, lastName, or modifiedAt'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      page: z.number().optional().describe('Page number (1-based)')
    })
  )
  .output(
    z.object({
      customers: z.array(
        z.object({
          customerId: z.number().describe('Customer ID'),
          firstName: z.string().nullable().describe('First name'),
          lastName: z.string().nullable().describe('Last name'),
          email: z.string().nullable().describe('Primary email'),
          organization: z.string().nullable().describe('Organization name'),
          organizationId: z.number().nullable().optional().describe('Organization ID'),
          jobTitle: z.string().nullable().describe('Job title'),
          createdAt: z.string().describe('Creation timestamp')
        })
      ),
      totalCount: z.number().describe('Total matching customers'),
      currentPage: z.number().describe('Current page'),
      totalPages: z.number().describe('Total pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HelpScoutClient(ctx.auth.token);
    // Email is not a URL filter; it is only searchable through the query syntax.
    // https://developer.helpscout.com/mailbox-api/endpoints/customers/list/
    let queryParts: string[] = [];
    if (ctx.input.query) queryParts.push(ctx.input.query);
    if (ctx.input.email) {
      queryParts.push(`(email:"${ctx.input.email.replace(/["\\]/g, '\\$&')}")`);
    }

    let data = await client.listCustomers({
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      mailbox: ctx.input.mailboxId,
      modifiedSince: ctx.input.modifiedSince,
      query:
        queryParts.length > 1
          ? `(${queryParts.join(' AND ')})`
          : queryParts.length === 1
            ? queryParts[0]
            : undefined,
      sortField: ctx.input.sortField,
      sortOrder: ctx.input.sortOrder,
      page: ctx.input.page
    });

    let embedded = data?._embedded?.customers ?? [];
    let customers = embedded.map((c: any) => ({
      customerId: c.id,
      firstName: c.firstName ?? null,
      lastName: c.lastName ?? null,
      email: c._embedded?.emails?.[0]?.value ?? null,
      organization: c.organization ?? null,
      organizationId: c.organizationId ?? null,
      jobTitle: c.jobTitle ?? null,
      createdAt: c.createdAt
    }));

    let page = halPageInfo(data, customers.length);

    return {
      output: {
        customers,
        ...page
      },
      message: `Found **${page.totalCount}** customers (page ${page.currentPage} of ${page.totalPages}).`
    };
  })
  .build();

export let getCustomer = SlateTool.create(spec, {
  name: 'Get Customer',
  key: 'get_customer',
  description: `Retrieve a customer's full profile including all emails, phone numbers, and other contact information.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      customerId: z.number().describe('Customer ID to retrieve')
    })
  )
  .output(
    z.object({
      customerId: z.number().describe('Customer ID'),
      firstName: z.string().nullable().describe('First name'),
      lastName: z.string().nullable().describe('Last name'),
      emails: z
        .array(
          z.object({
            emailId: z.number().describe('Email entry ID'),
            type: z.string().describe('Email type (home, work, other)'),
            value: z.string().describe('Email address')
          })
        )
        .describe('Customer email addresses'),
      phones: z
        .array(
          z.object({
            phoneId: z.number().describe('Phone entry ID'),
            type: z.string().describe('Phone type'),
            value: z.string().describe('Phone number')
          })
        )
        .describe('Customer phone numbers'),
      organization: z.string().nullable().describe('Organization name'),
      organizationId: z.number().nullable().optional().describe('Organization ID'),
      jobTitle: z.string().nullable().describe('Job title'),
      location: z.string().nullable().optional().describe('Location'),
      background: z.string().nullable().describe('Background notes'),
      createdAt: z.string().describe('Creation timestamp'),
      modifiedAt: z.string().optional().describe('Last modified timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HelpScoutClient(ctx.auth.token);
    let data = await client.getCustomer(ctx.input.customerId);

    let emails = (data._embedded?.emails ?? []).map((e: any) => ({
      emailId: e.id,
      type: e.type,
      value: e.value
    }));

    let phones = (data._embedded?.phones ?? []).map((p: any) => ({
      phoneId: p.id,
      type: p.type,
      value: p.value
    }));

    return {
      output: {
        customerId: data.id,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        emails,
        phones,
        organization: data.organization ?? null,
        organizationId: data.organizationId ?? null,
        jobTitle: data.jobTitle ?? null,
        location: data.location ?? null,
        background: data.background ?? null,
        createdAt: data.createdAt,
        modifiedAt: data.updatedAt
      },
      message: `Customer **${[data.firstName, data.lastName].filter(Boolean).join(' ') || data.id}** — ${emails.length} emails, ${phones.length} phones.`
    };
  })
  .build();

export let createCustomer = SlateTool.create(spec, {
  name: 'Create Customer',
  key: 'create_customer',
  description: `Create a new customer profile with contact information. At minimum provide a first name or email address.`
})
  .input(
    z.object({
      firstName: z.string().optional().describe('Customer first name'),
      lastName: z.string().optional().describe('Customer last name'),
      emails: z
        .array(
          z.object({
            type: z.enum(['home', 'work', 'other']).default('work').describe('Email type'),
            value: z.string().describe('Email address')
          })
        )
        .optional()
        .describe('Email addresses to add'),
      phones: z
        .array(
          z.object({
            type: z
              .enum(['home', 'work', 'mobile', 'fax', 'pager', 'other'])
              .default('work')
              .describe('Phone type'),
            value: z.string().describe('Phone number')
          })
        )
        .optional()
        .describe('Phone numbers to add'),
      organization: z
        .string()
        .optional()
        .describe('Organization/company name (ignored when organizationId is set)'),
      organizationId: z
        .number()
        .optional()
        .describe('Organization ID to link. Call manage_organization to discover IDs.'),
      jobTitle: z.string().optional().describe('Job title (max 60 characters)'),
      background: z
        .string()
        .optional()
        .describe('Background notes about the customer (max 200 characters)')
    })
  )
  .output(
    z.object({
      customerId: z.string().nullable().describe('ID of the created customer')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HelpScoutClient(ctx.auth.token);

    if (!ctx.input.firstName && !ctx.input.emails?.length) {
      throw helpscoutServiceError(
        'Provide at least a first name or email address to create a customer.'
      );
    }

    let result = await client.createCustomer({
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      emails: ctx.input.emails,
      phones: ctx.input.phones,
      organization: ctx.input.organization,
      organizationId: ctx.input.organizationId,
      jobTitle: ctx.input.jobTitle,
      background: ctx.input.background
    });

    return {
      output: {
        customerId: result.customerId ?? null
      },
      message: `Created customer **${[ctx.input.firstName, ctx.input.lastName].filter(Boolean).join(' ') || 'new customer'}**.`
    };
  })
  .build();

export let updateCustomer = SlateTool.create(spec, {
  name: 'Update Customer',
  key: 'update_customer',
  description: `Update an existing customer's profile. Change their name, organization, job title, location, or background notes, and add or remove email addresses and phone numbers. Fields that are not provided are left unchanged.`,
  instructions: [
    'Call get_customer to discover the email and phone entry IDs used by removeEmailIds and removePhoneIds.'
  ]
})
  .input(
    z.object({
      customerId: z.number().describe('Customer ID to update'),
      firstName: z.string().optional().describe('New first name'),
      lastName: z.string().optional().describe('New last name'),
      organization: z.string().optional().describe('New organization name'),
      organizationId: z
        .number()
        .optional()
        .describe('Link the customer to this organization ID (from manage_organization)'),
      jobTitle: z.string().optional().describe('New job title'),
      location: z.string().optional().describe('New location'),
      background: z.string().optional().describe('New background notes'),
      addEmails: z
        .array(
          z.object({
            type: z.enum(['home', 'work', 'other']).default('work'),
            value: z.string()
          })
        )
        .optional()
        .describe('Email addresses to add'),
      removeEmailIds: z.array(z.number()).optional().describe('Email entry IDs to remove'),
      addPhones: z
        .array(
          z.object({
            type: z.enum(['home', 'work', 'mobile', 'fax', 'pager', 'other']).default('work'),
            value: z.string()
          })
        )
        .optional()
        .describe('Phone numbers to add'),
      removePhoneIds: z.array(z.number()).optional().describe('Phone entry IDs to remove')
    })
  )
  .output(
    z.object({
      customerId: z.number().describe('Updated customer ID'),
      updated: z.array(z.string()).describe('List of fields/actions updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HelpScoutClient(ctx.auth.token);
    let updated: string[] = [];
    let operations: HelpScoutPatchOperation[] = [];

    // Partial updates use JSON Patch; PUT /customers/{id} would null omitted fields.
    // https://developer.helpscout.com/mailbox-api/endpoints/customers/update/
    let profileFields = [
      'firstName',
      'lastName',
      'organization',
      'jobTitle',
      'location',
      'background'
    ] as const;
    for (let field of profileFields) {
      let value = ctx.input[field];
      if (value !== undefined) {
        operations.push({ op: 'replace', path: `/${field}`, value });
        updated.push(field);
      }
    }

    // organizationId is not a supported patch path, so it goes through the
    // overwrite endpoint with the current profile values preserved.
    // https://developer.helpscout.com/mailbox-api/endpoints/customers/overwrite/
    let organizationId = ctx.input.organizationId;

    for (let email of ctx.input.addEmails ?? []) {
      operations.push({ op: 'add', path: '/emails', value: email });
    }
    if (ctx.input.addEmails?.length) {
      updated.push(`added ${ctx.input.addEmails.length} email(s)`);
    }

    for (let emailId of ctx.input.removeEmailIds ?? []) {
      operations.push({ op: 'remove', path: `/emails/${emailId}` });
    }
    if (ctx.input.removeEmailIds?.length) {
      updated.push(`removed ${ctx.input.removeEmailIds.length} email(s)`);
    }

    for (let phone of ctx.input.addPhones ?? []) {
      operations.push({ op: 'add', path: '/phones', value: phone });
    }
    if (ctx.input.addPhones?.length) {
      updated.push(`added ${ctx.input.addPhones.length} phone(s)`);
    }

    for (let phoneId of ctx.input.removePhoneIds ?? []) {
      operations.push({ op: 'remove', path: `/phones/${phoneId}` });
    }
    if (ctx.input.removePhoneIds?.length) {
      updated.push(`removed ${ctx.input.removePhoneIds.length} phone(s)`);
    }

    if (operations.length === 0 && organizationId === undefined) {
      throw helpscoutServiceError(
        'Provide at least one customer field or contact method to update.'
      );
    }

    if (operations.length > 0) {
      await client.patchCustomer(ctx.input.customerId, operations);
    }

    if (organizationId !== undefined) {
      let current = await client.getCustomer(ctx.input.customerId);
      await client.overwriteCustomer(ctx.input.customerId, {
        firstName: current.firstName ?? undefined,
        lastName: current.lastName ?? undefined,
        photoUrl: current.photoUrl ?? undefined,
        photoType: current.photoType ?? undefined,
        jobTitle: current.jobTitle ?? undefined,
        location: current.location ?? undefined,
        background: current.background ?? undefined,
        age: current.age ?? undefined,
        gender: current.gender ?? undefined,
        organizationId
      });
      updated.push('organizationId');
    }

    return {
      output: {
        customerId: ctx.input.customerId,
        updated
      },
      message: `Updated customer **#${ctx.input.customerId}**: ${updated.join(', ')}.`
    };
  })
  .build();

export let deleteCustomer = SlateTool.create(spec, {
  name: 'Delete Customer',
  key: 'delete_customer',
  description: `Permanently delete a customer and their associated survey responses and conversations. This supports Help Scout's GDPR erasure workflow and cannot be undone.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      customerId: z.number().describe('Customer ID to permanently delete')
    })
  )
  .output(
    z.object({
      customerId: z.number().describe('Deleted customer ID'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HelpScoutClient(ctx.auth.token);
    await client.deleteCustomer(ctx.input.customerId);

    return {
      output: {
        customerId: ctx.input.customerId,
        deleted: true
      },
      message: `Deleted customer **#${ctx.input.customerId}**.`
    };
  })
  .build();
