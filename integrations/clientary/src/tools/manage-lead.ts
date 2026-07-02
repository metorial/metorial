import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let leadSchema = z.object({
  leadId: z.number().describe('Unique ID of the lead'),
  name: z.string().describe('Lead name'),
  number: z.string().optional().describe('Unique lead number'),
  address: z.string().optional().describe('Street address'),
  city: z.string().optional().describe('City'),
  state: z.string().optional().describe('State or province'),
  zip: z.string().optional().describe('Postal/ZIP code'),
  country: z.string().optional().describe('Country'),
  website: z.string().optional().describe('Website URL'),
  description: z.string().optional().describe('Description or notes')
});

export let createLead = SlateTool.create(spec, {
  name: 'Create Lead',
  key: 'create_lead',
  description: `Create a new lead (prospective client) in Clientary. Leads can contain estimates and contacts, and can later be converted to clients.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Lead name (required)'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State or province'),
      zip: z.string().optional().describe('Postal/ZIP code'),
      country: z.string().optional().describe('Country'),
      website: z.string().optional().describe('Website URL'),
      description: z.string().optional().describe('Description or notes about the lead')
    })
  )
  .output(leadSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    let data: Record<string, any> = { name: ctx.input.name };
    if (ctx.input.address) data.address = ctx.input.address;
    if (ctx.input.city) data.city = ctx.input.city;
    if (ctx.input.state) data.state = ctx.input.state;
    if (ctx.input.zip) data.zip = ctx.input.zip;
    if (ctx.input.country) data.country = ctx.input.country;
    if (ctx.input.website) data.website = ctx.input.website;
    if (ctx.input.description) data.description = ctx.input.description;

    let result = await client.createLead(data);
    let l = result.lead || result;

    return {
      output: {
        leadId: l.id,
        name: l.name,
        number: l.number,
        address: l.address,
        city: l.city,
        state: l.state,
        zip: l.zip,
        country: l.country,
        website: l.website,
        description: l.description
      },
      message: `Created lead **${l.name}** (ID: ${l.id}).`
    };
  })
  .build();

export let updateLead = SlateTool.create(spec, {
  name: 'Update Lead',
  key: 'update_lead',
  description: `Update an existing lead's information in Clientary.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      leadId: z.number().describe('ID of the lead to update'),
      name: z.string().optional().describe('Lead name'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State or province'),
      zip: z.string().optional().describe('Postal/ZIP code'),
      country: z.string().optional().describe('Country'),
      website: z.string().optional().describe('Website URL'),
      description: z.string().optional().describe('Description or notes about the lead')
    })
  )
  .output(leadSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    let data: Record<string, any> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.address !== undefined) data.address = ctx.input.address;
    if (ctx.input.city !== undefined) data.city = ctx.input.city;
    if (ctx.input.state !== undefined) data.state = ctx.input.state;
    if (ctx.input.zip !== undefined) data.zip = ctx.input.zip;
    if (ctx.input.country !== undefined) data.country = ctx.input.country;
    if (ctx.input.website !== undefined) data.website = ctx.input.website;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;

    let result = await client.updateLead(ctx.input.leadId, data);
    let l = result.lead || result;

    return {
      output: {
        leadId: l.id,
        name: l.name,
        number: l.number,
        address: l.address,
        city: l.city,
        state: l.state,
        zip: l.zip,
        country: l.country,
        website: l.website,
        description: l.description
      },
      message: `Updated lead **${l.name}** (ID: ${l.id}).`
    };
  })
  .build();

export let getLeads = SlateTool.create(spec, {
  name: 'Get Leads',
  key: 'get_leads',
  description: `Retrieve a specific lead by ID or list all leads with pagination and sorting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      leadId: z
        .number()
        .optional()
        .describe('ID of a specific lead to retrieve. If omitted, lists leads.'),
      page: z.number().optional().describe('Page number for pagination (20 results per page)'),
      sort: z.enum(['name', 'newest', 'oldest']).optional().describe('Sort order for the list')
    })
  )
  .output(
    z.object({
      leads: z.array(leadSchema).describe('List of leads'),
      totalCount: z.number().optional().describe('Total number of matching leads'),
      pageCount: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    if (ctx.input.leadId) {
      let result = await client.getLead(ctx.input.leadId);
      let l = result.lead || result;
      return {
        output: {
          leads: [
            {
              leadId: l.id,
              name: l.name,
              number: l.number,
              address: l.address,
              city: l.city,
              state: l.state,
              zip: l.zip,
              country: l.country,
              website: l.website,
              description: l.description
            }
          ]
        },
        message: `Retrieved lead **${l.name}** (ID: ${l.id}).`
      };
    }

    let result = await client.listLeads({
      page: ctx.input.page,
      sort: ctx.input.sort
    });

    let leads = (result.leads || []).map((l: any) => ({
      leadId: l.id,
      name: l.name,
      number: l.number,
      address: l.address,
      city: l.city,
      state: l.state,
      zip: l.zip,
      country: l.country,
      website: l.website,
      description: l.description
    }));

    return {
      output: {
        leads,
        totalCount: result.total_count,
        pageCount: result.page_count
      },
      message: `Retrieved ${leads.length} lead(s)${result.total_count ? ` (${result.total_count} total)` : ''}.`
    };
  })
  .build();

export let deleteLead = SlateTool.create(spec, {
  name: 'Delete Lead',
  key: 'delete_lead',
  description: `Permanently delete a lead. **Warning:** This also deletes all associated estimates and contacts.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      leadId: z.number().describe('ID of the lead to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    await client.deleteLead(ctx.input.leadId);

    return {
      output: { success: true },
      message: `Deleted lead ID ${ctx.input.leadId} and all associated data.`
    };
  })
  .build();
