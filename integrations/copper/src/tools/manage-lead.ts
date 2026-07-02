import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let leadOutputSchema = z.object({
  leadId: z.number().describe('Unique ID of the lead'),
  name: z.string().nullable().describe('Lead name'),
  firstName: z.string().nullable().optional().describe('First name'),
  lastName: z.string().nullable().optional().describe('Last name'),
  title: z.string().nullable().optional().describe('Job title'),
  companyName: z.string().nullable().optional().describe('Company name'),
  assigneeId: z.number().nullable().optional().describe('Assigned user ID'),
  customerSourceId: z.number().nullable().optional().describe('Customer source ID'),
  monetaryValue: z.number().nullable().optional().describe('Monetary value'),
  status: z.string().nullable().optional().describe('Lead status'),
  statusId: z.number().nullable().optional().describe('Lead status ID'),
  email: z.any().nullable().optional().describe('Primary email'),
  phoneNumbers: z.array(z.any()).optional().describe('Phone numbers'),
  address: z.any().nullable().optional().describe('Physical address'),
  tags: z.array(z.string()).optional().describe('Tags'),
  details: z.string().nullable().optional().describe('Additional details'),
  dateCreated: z.number().nullable().optional().describe('Creation timestamp (Unix)'),
  dateModified: z.number().nullable().optional().describe('Last modified timestamp (Unix)'),
  customFields: z.array(z.any()).optional().describe('Custom field values')
});

let mapLead = (l: any) => ({
  leadId: l.id,
  name: l.name,
  firstName: l.first_name,
  lastName: l.last_name,
  title: l.title,
  companyName: l.company_name,
  assigneeId: l.assignee_id,
  customerSourceId: l.customer_source_id,
  monetaryValue: l.monetary_value,
  status: l.status,
  statusId: l.status_id,
  email: l.email,
  phoneNumbers: l.phone_numbers,
  address: l.address,
  tags: l.tags,
  details: l.details,
  dateCreated: l.date_created,
  dateModified: l.date_modified,
  customFields: l.custom_fields
});

export let createLead = SlateTool.create(spec, {
  name: 'Create Lead',
  key: 'create_lead',
  description: `Create a new lead in Copper CRM. Leads represent potential sales contacts that can later be converted into people, companies, or opportunities.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      name: z.string().describe('Lead name'),
      email: z
        .object({
          email: z.string().describe('Email address'),
          category: z.string().optional().describe('Category: "work", "personal", or "other"')
        })
        .optional()
        .describe('Primary email'),
      phoneNumbers: z
        .array(
          z.object({
            number: z.string(),
            category: z.string().optional()
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
      title: z.string().optional().describe('Job title'),
      companyName: z.string().optional().describe('Company name'),
      assigneeId: z.number().optional().describe('User ID to assign the lead to'),
      customerSourceId: z.number().optional().describe('Customer source ID'),
      monetaryValue: z.number().optional().describe('Monetary value of the lead'),
      details: z.string().optional().describe('Additional notes'),
      tags: z.array(z.string()).optional().describe('Tags'),
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
  .output(leadOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let body: Record<string, any> = { name: ctx.input.name };
    if (ctx.input.email) body.email = ctx.input.email;
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
    if (ctx.input.title) body.title = ctx.input.title;
    if (ctx.input.companyName) body.company_name = ctx.input.companyName;
    if (ctx.input.assigneeId) body.assignee_id = ctx.input.assigneeId;
    if (ctx.input.customerSourceId) body.customer_source_id = ctx.input.customerSourceId;
    if (ctx.input.monetaryValue !== undefined) body.monetary_value = ctx.input.monetaryValue;
    if (ctx.input.details) body.details = ctx.input.details;
    if (ctx.input.tags) body.tags = ctx.input.tags;
    if (ctx.input.customFields) {
      body.custom_fields = ctx.input.customFields.map(cf => ({
        custom_field_definition_id: cf.customFieldDefinitionId,
        value: cf.value
      }));
    }

    let lead = await client.createLead(body);

    return {
      output: mapLead(lead),
      message: `Created lead **${lead.name}** (ID: ${lead.id}).`
    };
  })
  .build();

export let getLead = SlateTool.create(spec, {
  name: 'Get Lead',
  key: 'get_lead',
  description: `Retrieve a lead record by its ID. Returns full lead details including status, customer source, and custom fields.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      leadId: z.number().describe('ID of the lead to retrieve')
    })
  )
  .output(leadOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let lead = await client.getLead(ctx.input.leadId);

    return {
      output: mapLead(lead),
      message: `Retrieved lead **${lead.name}** (ID: ${lead.id}).`
    };
  })
  .build();

export let updateLead = SlateTool.create(spec, {
  name: 'Update Lead',
  key: 'update_lead',
  description: `Update an existing lead record in Copper CRM. Only provided fields will be updated.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      leadId: z.number().describe('ID of the lead to update'),
      name: z.string().optional().describe('Updated lead name'),
      email: z
        .object({
          email: z.string(),
          category: z.string().optional()
        })
        .optional()
        .describe('Updated primary email'),
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
      title: z.string().optional().describe('Updated job title'),
      companyName: z.string().optional().describe('Updated company name'),
      assigneeId: z.number().optional().describe('Updated assignee user ID'),
      customerSourceId: z.number().optional().describe('Updated customer source ID'),
      monetaryValue: z.number().optional().describe('Updated monetary value'),
      details: z.string().optional().describe('Updated notes'),
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
  .output(leadOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let body: Record<string, any> = {};
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.email !== undefined) body.email = ctx.input.email;
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
    if (ctx.input.title !== undefined) body.title = ctx.input.title;
    if (ctx.input.companyName !== undefined) body.company_name = ctx.input.companyName;
    if (ctx.input.assigneeId !== undefined) body.assignee_id = ctx.input.assigneeId;
    if (ctx.input.customerSourceId !== undefined)
      body.customer_source_id = ctx.input.customerSourceId;
    if (ctx.input.monetaryValue !== undefined) body.monetary_value = ctx.input.monetaryValue;
    if (ctx.input.details !== undefined) body.details = ctx.input.details;
    if (ctx.input.tags !== undefined) body.tags = ctx.input.tags;
    if (ctx.input.customFields !== undefined) {
      body.custom_fields = ctx.input.customFields.map(cf => ({
        custom_field_definition_id: cf.customFieldDefinitionId,
        value: cf.value
      }));
    }

    let lead = await client.updateLead(ctx.input.leadId, body);

    return {
      output: mapLead(lead),
      message: `Updated lead **${lead.name}** (ID: ${lead.id}).`
    };
  })
  .build();

export let deleteLead = SlateTool.create(spec, {
  name: 'Delete Lead',
  key: 'delete_lead',
  description: `Permanently delete a lead record from Copper CRM. This action cannot be undone.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      leadId: z.number().describe('ID of the lead to delete')
    })
  )
  .output(
    z.object({
      leadId: z.number().describe('ID of the deleted lead'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    await client.deleteLead(ctx.input.leadId);

    return {
      output: { leadId: ctx.input.leadId, deleted: true },
      message: `Deleted lead with ID ${ctx.input.leadId}.`
    };
  })
  .build();

export let searchLeads = SlateTool.create(spec, {
  name: 'Search Leads',
  key: 'search_leads',
  description: `Search for leads in Copper CRM with flexible filtering. Supports filtering by name, status, assignee, customer source, tags, and more.`,
  constraints: ['Maximum 200 results per page', 'Maximum 100,000 total results per search'],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      pageNumber: z.number().optional().default(1).describe('Page number (starting at 1)'),
      pageSize: z.number().optional().default(20).describe('Results per page (max 200)'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      name: z.string().optional().describe('Filter by lead name'),
      assigneeIds: z.array(z.number()).optional().describe('Filter by assignee user IDs'),
      statusIds: z.array(z.number()).optional().describe('Filter by lead status IDs'),
      customerSourceIds: z
        .array(z.number())
        .optional()
        .describe('Filter by customer source IDs'),
      city: z.string().optional().describe('Filter by city'),
      state: z.string().optional().describe('Filter by state'),
      country: z.string().optional().describe('Filter by country'),
      tags: z.array(z.string()).optional().describe('Filter by tags')
    })
  )
  .output(
    z.object({
      leads: z.array(leadOutputSchema).describe('Matching lead records'),
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
    if (ctx.input.assigneeIds) body.assignee_ids = ctx.input.assigneeIds;
    if (ctx.input.statusIds) body.status_ids = ctx.input.statusIds;
    if (ctx.input.customerSourceIds) body.customer_source_ids = ctx.input.customerSourceIds;
    if (ctx.input.city) body.city = ctx.input.city;
    if (ctx.input.state) body.state = ctx.input.state;
    if (ctx.input.country) body.country = ctx.input.country;
    if (ctx.input.tags) body.tags = ctx.input.tags;

    let leads = await client.searchLeads(body);

    return {
      output: {
        leads: leads.map(mapLead),
        count: leads.length
      },
      message: `Found **${leads.length}** leads matching the search criteria.`
    };
  })
  .build();

export let convertLead = SlateTool.create(spec, {
  name: 'Convert Lead',
  key: 'convert_lead',
  description: `Convert a lead into a person, with optional creation of an associated company and opportunity. The original lead is deleted upon successful conversion.`,
  instructions: [
    'The lead will be permanently deleted after conversion',
    'Company can be specified by existing ID, by name for fuzzy matching, or as a new company name'
  ],
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      leadId: z.number().describe('ID of the lead to convert'),
      person: z
        .object({
          name: z
            .string()
            .optional()
            .describe('Name for the new person (defaults to lead name)'),
          contactTypeId: z.number().optional().describe('Contact type ID for the new person'),
          assigneeId: z.number().optional().describe('User ID to assign the new person to')
        })
        .optional()
        .describe('Person details for the conversion'),
      company: z
        .object({
          existingCompanyId: z
            .number()
            .optional()
            .describe('ID of an existing company to associate'),
          name: z
            .string()
            .optional()
            .describe('Name of the company (for fuzzy match or creation)')
        })
        .optional()
        .describe('Company to associate with the converted person'),
      opportunity: z
        .object({
          name: z.string().optional().describe('Opportunity name'),
          pipelineId: z.number().optional().describe('Pipeline ID'),
          pipelineStageId: z.number().optional().describe('Pipeline stage ID'),
          monetaryValue: z.number().optional().describe('Monetary value'),
          assigneeId: z.number().optional().describe('Assignee user ID')
        })
        .optional()
        .describe('Optional opportunity to create during conversion')
    })
  )
  .output(
    z.object({
      person: z.any().describe('Newly created person record'),
      company: z.any().nullable().describe('Associated company record'),
      opportunity: z.any().nullable().describe('Created opportunity record (if requested)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let details: Record<string, any> = {};
    if (ctx.input.person) {
      details.person = {};
      if (ctx.input.person.name) details.person.name = ctx.input.person.name;
      if (ctx.input.person.contactTypeId)
        details.person.contact_type_id = ctx.input.person.contactTypeId;
      if (ctx.input.person.assigneeId)
        details.person.assignee_id = ctx.input.person.assigneeId;
    }
    if (ctx.input.company) {
      details.company = {};
      if (ctx.input.company.existingCompanyId)
        details.company.id = ctx.input.company.existingCompanyId;
      if (ctx.input.company.name) details.company.name = ctx.input.company.name;
    }
    if (ctx.input.opportunity) {
      details.opportunity = {};
      if (ctx.input.opportunity.name) details.opportunity.name = ctx.input.opportunity.name;
      if (ctx.input.opportunity.pipelineId)
        details.opportunity.pipeline_id = ctx.input.opportunity.pipelineId;
      if (ctx.input.opportunity.pipelineStageId)
        details.opportunity.pipeline_stage_id = ctx.input.opportunity.pipelineStageId;
      if (ctx.input.opportunity.monetaryValue !== undefined)
        details.opportunity.monetary_value = ctx.input.opportunity.monetaryValue;
      if (ctx.input.opportunity.assigneeId)
        details.opportunity.assignee_id = ctx.input.opportunity.assigneeId;
    }

    let result = await client.convertLead(ctx.input.leadId, details);

    return {
      output: {
        person: result.person,
        company: result.company || null,
        opportunity: result.opportunity || null
      },
      message: `Converted lead ${ctx.input.leadId} into person **${result.person?.name || 'Unknown'}**.`
    };
  })
  .build();
