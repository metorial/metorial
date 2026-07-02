import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let companyOutputSchema = z.object({
  companyId: z.number().describe('Unique ID of the company'),
  name: z.string().nullable().describe('Company name'),
  assigneeId: z.number().nullable().optional().describe('Assigned user ID'),
  contactTypeId: z.number().nullable().optional().describe('Contact type ID'),
  emailDomain: z.string().nullable().optional().describe('Email domain'),
  details: z.string().nullable().optional().describe('Additional details/notes'),
  phoneNumbers: z.array(z.any()).optional().describe('Phone numbers'),
  address: z.any().nullable().optional().describe('Physical address'),
  tags: z.array(z.string()).optional().describe('Tags'),
  websites: z.array(z.any()).optional().describe('Websites'),
  socials: z.array(z.any()).optional().describe('Social profiles'),
  dateCreated: z.number().nullable().optional().describe('Creation timestamp (Unix)'),
  dateModified: z.number().nullable().optional().describe('Last modified timestamp (Unix)'),
  customFields: z.array(z.any()).optional().describe('Custom field values'),
  interactionCount: z.number().nullable().optional().describe('Total interaction count')
});

let mapCompany = (c: any) => ({
  companyId: c.id,
  name: c.name,
  assigneeId: c.assignee_id,
  contactTypeId: c.contact_type_id,
  emailDomain: c.email_domain,
  details: c.details,
  phoneNumbers: c.phone_numbers,
  address: c.address,
  tags: c.tags,
  websites: c.websites,
  socials: c.socials,
  dateCreated: c.date_created,
  dateModified: c.date_modified,
  customFields: c.custom_fields,
  interactionCount: c.interaction_count
});

export let createCompany = SlateTool.create(spec, {
  name: 'Create Company',
  key: 'create_company',
  description: `Create a new company record in Copper CRM. Companies can be associated with people, opportunities, and projects.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      name: z.string().describe('Company name'),
      emailDomain: z
        .string()
        .optional()
        .describe('Company email domain (e.g., "example.com")'),
      assigneeId: z.number().optional().describe('ID of the user to assign this company to'),
      contactTypeId: z.number().optional().describe('Contact type ID'),
      details: z.string().optional().describe('Additional notes or details'),
      phoneNumbers: z
        .array(
          z.object({
            number: z.string().describe('Phone number'),
            category: z
              .string()
              .optional()
              .describe('Category: "work", "mobile", "home", or "other"')
          })
        )
        .optional()
        .describe('Phone numbers'),
      address: z
        .object({
          street: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          postalCode: z.string().optional(),
          country: z.string().optional()
        })
        .optional()
        .describe('Physical address'),
      tags: z.array(z.string()).optional().describe('Tags'),
      socials: z
        .array(
          z.object({
            url: z.string().describe('Social profile URL'),
            category: z.string().optional().describe('Category')
          })
        )
        .optional()
        .describe('Social profiles'),
      websites: z
        .array(
          z.object({
            url: z.string().describe('Website URL'),
            category: z.string().optional().describe('Category')
          })
        )
        .optional()
        .describe('Websites'),
      customFields: z
        .array(
          z.object({
            customFieldDefinitionId: z.number(),
            value: z.any()
          })
        )
        .optional()
        .describe('Custom field values')
    })
  )
  .output(companyOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let body: Record<string, any> = { name: ctx.input.name };
    if (ctx.input.emailDomain) body.email_domain = ctx.input.emailDomain;
    if (ctx.input.assigneeId) body.assignee_id = ctx.input.assigneeId;
    if (ctx.input.contactTypeId) body.contact_type_id = ctx.input.contactTypeId;
    if (ctx.input.details) body.details = ctx.input.details;
    if (ctx.input.phoneNumbers) body.phone_numbers = ctx.input.phoneNumbers;
    if (ctx.input.address) {
      body.address = {
        street: ctx.input.address.street,
        city: ctx.input.address.city,
        state: ctx.input.address.state,
        postal_code: ctx.input.address.postalCode,
        country: ctx.input.address.country
      };
    }
    if (ctx.input.tags) body.tags = ctx.input.tags;
    if (ctx.input.socials) body.socials = ctx.input.socials;
    if (ctx.input.websites) body.websites = ctx.input.websites;
    if (ctx.input.customFields) {
      body.custom_fields = ctx.input.customFields.map(cf => ({
        custom_field_definition_id: cf.customFieldDefinitionId,
        value: cf.value
      }));
    }

    let company = await client.createCompany(body);

    return {
      output: mapCompany(company),
      message: `Created company **${company.name}** (ID: ${company.id}).`
    };
  })
  .build();

export let getCompany = SlateTool.create(spec, {
  name: 'Get Company',
  key: 'get_company',
  description: `Retrieve a company record by its ID. Returns full company details including address, tags, and custom fields.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      companyId: z.number().describe('ID of the company to retrieve')
    })
  )
  .output(companyOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let company = await client.getCompany(ctx.input.companyId);

    return {
      output: mapCompany(company),
      message: `Retrieved company **${company.name}** (ID: ${company.id}).`
    };
  })
  .build();

export let updateCompany = SlateTool.create(spec, {
  name: 'Update Company',
  key: 'update_company',
  description: `Update an existing company record in Copper CRM. Only provided fields will be updated.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      companyId: z.number().describe('ID of the company to update'),
      name: z.string().optional().describe('Updated company name'),
      emailDomain: z.string().optional().describe('Updated email domain'),
      assigneeId: z.number().optional().describe('Updated assignee user ID'),
      contactTypeId: z.number().optional().describe('Updated contact type ID'),
      details: z.string().optional().describe('Updated notes/details'),
      phoneNumbers: z
        .array(
          z.object({
            number: z.string(),
            category: z.string().optional()
          })
        )
        .optional()
        .describe('Updated phone numbers'),
      address: z
        .object({
          street: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          postalCode: z.string().optional(),
          country: z.string().optional()
        })
        .optional()
        .describe('Updated address'),
      tags: z.array(z.string()).optional().describe('Updated tags'),
      customFields: z
        .array(
          z.object({
            customFieldDefinitionId: z.number(),
            value: z.any()
          })
        )
        .optional()
        .describe('Updated custom fields')
    })
  )
  .output(companyOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let body: Record<string, any> = {};
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.emailDomain !== undefined) body.email_domain = ctx.input.emailDomain;
    if (ctx.input.assigneeId !== undefined) body.assignee_id = ctx.input.assigneeId;
    if (ctx.input.contactTypeId !== undefined) body.contact_type_id = ctx.input.contactTypeId;
    if (ctx.input.details !== undefined) body.details = ctx.input.details;
    if (ctx.input.phoneNumbers !== undefined) body.phone_numbers = ctx.input.phoneNumbers;
    if (ctx.input.address !== undefined) {
      body.address = {
        street: ctx.input.address.street,
        city: ctx.input.address.city,
        state: ctx.input.address.state,
        postal_code: ctx.input.address.postalCode,
        country: ctx.input.address.country
      };
    }
    if (ctx.input.tags !== undefined) body.tags = ctx.input.tags;
    if (ctx.input.customFields !== undefined) {
      body.custom_fields = ctx.input.customFields.map(cf => ({
        custom_field_definition_id: cf.customFieldDefinitionId,
        value: cf.value
      }));
    }

    let company = await client.updateCompany(ctx.input.companyId, body);

    return {
      output: mapCompany(company),
      message: `Updated company **${company.name}** (ID: ${company.id}).`
    };
  })
  .build();

export let deleteCompany = SlateTool.create(spec, {
  name: 'Delete Company',
  key: 'delete_company',
  description: `Permanently delete a company record from Copper CRM. This action cannot be undone.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      companyId: z.number().describe('ID of the company to delete')
    })
  )
  .output(
    z.object({
      companyId: z.number().describe('ID of the deleted company'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    await client.deleteCompany(ctx.input.companyId);

    return {
      output: { companyId: ctx.input.companyId, deleted: true },
      message: `Deleted company with ID ${ctx.input.companyId}.`
    };
  })
  .build();

export let searchCompanies = SlateTool.create(spec, {
  name: 'Search Companies',
  key: 'search_companies',
  description: `Search for companies in Copper CRM with flexible filtering. Supports filtering by name, email domain, tags, assignee, contact type, and more.`,
  constraints: ['Maximum 200 results per page', 'Maximum 100,000 total results per search'],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      pageNumber: z.number().optional().default(1).describe('Page number (starting at 1)'),
      pageSize: z.number().optional().default(20).describe('Results per page (max 200)'),
      sortBy: z
        .string()
        .optional()
        .describe('Field to sort by: name, city, state, date_modified, date_created'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      name: z.string().optional().describe('Filter by company name'),
      emailDomain: z.string().optional().describe('Filter by email domain'),
      assigneeIds: z.array(z.number()).optional().describe('Filter by assignee user IDs'),
      contactTypeIds: z.array(z.number()).optional().describe('Filter by contact type IDs'),
      city: z.string().optional().describe('Filter by city'),
      state: z.string().optional().describe('Filter by state'),
      country: z.string().optional().describe('Filter by country'),
      tags: z.array(z.string()).optional().describe('Filter by tags')
    })
  )
  .output(
    z.object({
      companies: z.array(companyOutputSchema).describe('Matching company records'),
      count: z.number().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let body: Record<string, any> = {
      page_number: ctx.input.pageNumber,
      page_size: ctx.input.pageSize
    };
    if (ctx.input.sortBy) body.sort_by = ctx.input.sortBy;
    if (ctx.input.sortDirection) body.sort_direction = ctx.input.sortDirection;
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.emailDomain) body.email_domain = ctx.input.emailDomain;
    if (ctx.input.assigneeIds) body.assignee_ids = ctx.input.assigneeIds;
    if (ctx.input.contactTypeIds) body.contact_type_ids = ctx.input.contactTypeIds;
    if (ctx.input.city) body.city = ctx.input.city;
    if (ctx.input.state) body.state = ctx.input.state;
    if (ctx.input.country) body.country = ctx.input.country;
    if (ctx.input.tags) body.tags = ctx.input.tags;

    let companies = await client.searchCompanies(body);

    return {
      output: {
        companies: companies.map(mapCompany),
        count: companies.length
      },
      message: `Found **${companies.length}** companies matching the search criteria.`
    };
  })
  .build();
