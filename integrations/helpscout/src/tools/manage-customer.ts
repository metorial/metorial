import { SlateTool } from 'slates';
import { z } from 'zod';
import { HelpScoutClient } from '../lib/client';
import { spec } from '../spec';

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: `Search and list customer profiles. Filter by email, name, mailbox, or use a custom query. Results are paginated.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter by customer email'),
      firstName: z.string().optional().describe('Filter by first name'),
      lastName: z.string().optional().describe('Filter by last name'),
      mailboxId: z.number().optional().describe('Filter by mailbox ID'),
      query: z.string().optional().describe('Custom search query (overrides other filters)'),
      sortField: z.string().optional().describe('Field to sort by'),
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
    let data = await client.listCustomers({
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      mailbox: ctx.input.mailboxId,
      query: ctx.input.query,
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
      jobTitle: c.jobTitle ?? null,
      createdAt: c.createdAt
    }));

    let page = data?.page ?? {};

    return {
      output: {
        customers,
        totalCount: page.totalElements ?? customers.length,
        currentPage: page.number ?? 1,
        totalPages: page.totalPages ?? 1
      },
      message: `Found **${page.totalElements ?? customers.length}** customers (page ${page.number ?? 1} of ${page.totalPages ?? 1}).`
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
      jobTitle: z.string().nullable().describe('Job title'),
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
        jobTitle: data.jobTitle ?? null,
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
      organization: z.string().optional().describe('Organization/company name'),
      jobTitle: z.string().optional().describe('Job title'),
      background: z.string().optional().describe('Background notes about the customer')
    })
  )
  .output(
    z.object({
      customerId: z.string().nullable().describe('ID of the created customer')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HelpScoutClient(ctx.auth.token);
    let result = await client.createCustomer({
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      emails: ctx.input.emails,
      phones: ctx.input.phones,
      organization: ctx.input.organization,
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
  description: `Update an existing customer's profile. Change their name, organization, job title, or background notes. To manage emails and phones, use the dedicated add/remove operations.`
})
  .input(
    z.object({
      customerId: z.number().describe('Customer ID to update'),
      firstName: z.string().optional().describe('New first name'),
      lastName: z.string().optional().describe('New last name'),
      organization: z.string().optional().describe('New organization name'),
      jobTitle: z.string().optional().describe('New job title'),
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

    let profileUpdates: Record<string, any> = {};
    if (ctx.input.firstName !== undefined) profileUpdates.firstName = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) profileUpdates.lastName = ctx.input.lastName;
    if (ctx.input.organization !== undefined)
      profileUpdates.organization = ctx.input.organization;
    if (ctx.input.jobTitle !== undefined) profileUpdates.jobTitle = ctx.input.jobTitle;
    if (ctx.input.background !== undefined) profileUpdates.background = ctx.input.background;

    if (Object.keys(profileUpdates).length > 0) {
      await client.updateCustomer(ctx.input.customerId, profileUpdates);
      updated.push(...Object.keys(profileUpdates));
    }

    if (ctx.input.addEmails) {
      for (let email of ctx.input.addEmails) {
        await client.createCustomerEmail(ctx.input.customerId, email);
      }
      updated.push(`added ${ctx.input.addEmails.length} email(s)`);
    }

    if (ctx.input.removeEmailIds) {
      for (let emailId of ctx.input.removeEmailIds) {
        await client.deleteCustomerEmail(ctx.input.customerId, emailId);
      }
      updated.push(`removed ${ctx.input.removeEmailIds.length} email(s)`);
    }

    if (ctx.input.addPhones) {
      for (let phone of ctx.input.addPhones) {
        await client.createCustomerPhone(ctx.input.customerId, phone);
      }
      updated.push(`added ${ctx.input.addPhones.length} phone(s)`);
    }

    if (ctx.input.removePhoneIds) {
      for (let phoneId of ctx.input.removePhoneIds) {
        await client.deleteCustomerPhone(ctx.input.customerId, phoneId);
      }
      updated.push(`removed ${ctx.input.removePhoneIds.length} phone(s)`);
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
