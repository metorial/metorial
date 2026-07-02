import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let leadSchema = z.object({
  leadId: z.number().describe('Lead ID'),
  firstname: z.string().optional().describe('First name'),
  lastname: z.string().optional().describe('Last name'),
  fullname: z.string().optional().describe('Full name'),
  businessName: z.string().optional().describe('Business name'),
  email: z.string().optional().describe('Email address'),
  phone: z.string().optional().describe('Phone number'),
  address: z.string().optional().describe('Address'),
  city: z.string().optional().describe('City'),
  state: z.string().optional().describe('State'),
  zip: z.string().optional().describe('ZIP/postal code'),
  notes: z.string().optional().describe('Lead notes'),
  status: z.string().optional().describe('Lead status'),
  assignedTo: z.string().optional().describe('Assigned user'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last updated timestamp')
});

let mapLead = (l: any) => ({
  leadId: l.id,
  firstname: l.firstname,
  lastname: l.lastname,
  fullname: l.fullname,
  businessName: l.business_name,
  email: l.email,
  phone: l.phone,
  address: l.address,
  city: l.city,
  state: l.state,
  zip: l.zip,
  notes: l.notes,
  status: l.status,
  assignedTo: l.assigned_to?.toString(),
  createdAt: l.created_at,
  updatedAt: l.updated_at
});

export let searchLeads = SlateTool.create(spec, {
  name: 'Search Leads',
  key: 'search_leads',
  description: `Search and list sales leads. Filter by status, assigned user, date range, or general query.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('General search query'),
      status: z.string().optional().describe('Filter by status'),
      assignedTo: z.number().optional().describe('Filter by assigned user ID'),
      createdBefore: z
        .string()
        .optional()
        .describe('Filter leads created before this date (YYYY-MM-DD)'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter leads created after this date (YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      leads: z.array(leadSchema),
      totalPages: z.number().optional(),
      totalEntries: z.number().optional(),
      page: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.listLeads(ctx.input);
    let leads = (result.leads || []).map(mapLead);

    return {
      output: {
        leads,
        totalPages: result.meta?.total_pages,
        totalEntries: result.meta?.total_entries,
        page: result.meta?.page
      },
      message: `Found **${leads.length}** lead(s).`
    };
  })
  .build();

export let getLead = SlateTool.create(spec, {
  name: 'Get Lead',
  key: 'get_lead',
  description: `Retrieve detailed information about a specific sales lead.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      leadId: z.number().describe('The lead ID to retrieve')
    })
  )
  .output(leadSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.getLead(ctx.input.leadId);
    let l = result.lead || result;

    return {
      output: mapLead(l),
      message: `Retrieved lead **${l.fullname || l.firstname || l.id}**.`
    };
  })
  .build();

export let createLead = SlateTool.create(spec, {
  name: 'Create Lead',
  key: 'create_lead',
  description: `Create a new sales lead. Leads can later be converted into customers and tickets.`
})
  .input(
    z.object({
      firstname: z.string().describe('First name'),
      lastname: z.string().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      businessName: z.string().optional().describe('Business name'),
      notes: z.string().optional().describe('Lead notes'),
      assignedTo: z.number().optional().describe('User ID to assign the lead to'),
      status: z.string().optional().describe('Initial lead status'),
      address: z.string().optional().describe('Address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State'),
      zip: z.string().optional().describe('ZIP/postal code')
    })
  )
  .output(leadSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let result = await client.createLead(ctx.input);
    let l = result.lead || result;

    return {
      output: mapLead(l),
      message: `Created lead **${l.fullname || l.firstname || l.id}** (ID: ${l.id}).`
    };
  })
  .build();

export let updateLead = SlateTool.create(spec, {
  name: 'Update Lead',
  key: 'update_lead',
  description: `Update an existing lead's information. Only provided fields are modified.`
})
  .input(
    z.object({
      leadId: z.number().describe('The lead ID to update'),
      firstname: z.string().optional().describe('First name'),
      lastname: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      businessName: z.string().optional().describe('Business name'),
      notes: z.string().optional().describe('Lead notes'),
      assignedTo: z.number().optional().describe('User ID to assign the lead to'),
      status: z.string().optional().describe('Updated lead status'),
      address: z.string().optional().describe('Address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State'),
      zip: z.string().optional().describe('ZIP/postal code')
    })
  )
  .output(leadSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    let { leadId, ...updateData } = ctx.input;
    let result = await client.updateLead(leadId, updateData);
    let l = result.lead || result;

    return {
      output: mapLead(l),
      message: `Updated lead **${l.fullname || l.firstname || l.id}**.`
    };
  })
  .build();
