import { SlateTool } from 'slates';
import { z } from 'zod';
import { TombaClient } from '../lib/client';
import { spec } from '../spec';

let leadOutputSchema = z.object({
  leadId: z.string().nullable().optional().describe('Lead ID'),
  email: z.string().nullable().optional().describe('Email address'),
  firstName: z.string().nullable().optional().describe('First name'),
  lastName: z.string().nullable().optional().describe('Last name'),
  company: z.string().nullable().optional().describe('Company name'),
  position: z.string().nullable().optional().describe('Job position'),
  score: z.number().nullable().optional().describe('Lead score'),
  websiteUrl: z.string().nullable().optional().describe('Website URL'),
  phoneNumber: z.string().nullable().optional().describe('Phone number'),
  twitter: z.string().nullable().optional().describe('Twitter handle'),
  country: z.string().nullable().optional().describe('Country'),
  linkedin: z.string().nullable().optional().describe('LinkedIn profile URL'),
  notes: z.string().nullable().optional().describe('Notes')
});

let mapLead = (l: any) => ({
  leadId: l.id?.toString(),
  email: l.email,
  firstName: l.first_name,
  lastName: l.last_name,
  company: l.company,
  position: l.position,
  score: l.score,
  websiteUrl: l.website_url,
  phoneNumber: l.phone_number,
  twitter: l.twitter,
  country: l.country,
  linkedin: l.linkedin,
  notes: l.notes
});

export let listLeads = SlateTool.create(spec, {
  name: 'List Leads',
  key: 'list_leads',
  description: `Retrieve a paginated list of leads. Optionally filter by domain.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().optional().describe('Filter leads by domain'),
      page: z.number().optional().describe('Page number (default: 1)'),
      limit: z.number().optional().describe('Results per page (default: 10)')
    })
  )
  .output(
    z.object({
      leads: z.array(leadOutputSchema).describe('List of leads'),
      total: z.number().nullable().optional().describe('Total leads count'),
      page: z.number().nullable().optional().describe('Current page'),
      limit: z.number().nullable().optional().describe('Results per page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TombaClient({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let result = await client.listLeads({
      domain: ctx.input.domain,
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let data = result.data || {};
    let leads = data.leads || data || [];
    let mapped = Array.isArray(leads) ? leads.map(mapLead) : [];

    return {
      output: {
        leads: mapped,
        total: data.total || mapped.length,
        page: data.page || ctx.input.page,
        limit: data.limit || ctx.input.limit
      },
      message: `Retrieved **${mapped.length}** leads.`
    };
  })
  .build();

export let getLead = SlateTool.create(spec, {
  name: 'Get Lead',
  key: 'get_lead',
  description: `Retrieve detailed information for a specific lead by its ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      leadId: z.string().describe('The lead ID to retrieve')
    })
  )
  .output(leadOutputSchema)
  .handleInvocation(async ctx => {
    let client = new TombaClient({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let result = await client.getLead(ctx.input.leadId);
    let data = result.data || result;

    return {
      output: mapLead(data),
      message: `Retrieved lead **${data.email || ctx.input.leadId}**.`
    };
  })
  .build();

export let createLead = SlateTool.create(spec, {
  name: 'Create Lead',
  key: 'create_lead',
  description: `Create a new lead in a specified lead list. The email must be unique within the list.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('The lead list ID to add the lead to'),
      email: z.string().describe('Email address (required, must be unique in the list)'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      position: z.string().optional().describe('Job position'),
      company: z.string().optional().describe('Company name'),
      score: z.number().optional().describe('Lead score'),
      websiteUrl: z.string().optional().describe('Website URL'),
      phoneNumber: z.string().optional().describe('Phone number'),
      twitter: z.string().optional().describe('Twitter handle'),
      country: z.string().optional().describe('Country'),
      linkedin: z.string().optional().describe('LinkedIn profile URL'),
      notes: z.string().optional().describe('Notes')
    })
  )
  .output(leadOutputSchema)
  .handleInvocation(async ctx => {
    let client = new TombaClient({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let result = await client.createLead({
      listId: ctx.input.listId,
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      position: ctx.input.position,
      company: ctx.input.company,
      score: ctx.input.score,
      websiteUrl: ctx.input.websiteUrl,
      phoneNumber: ctx.input.phoneNumber,
      twitter: ctx.input.twitter,
      country: ctx.input.country,
      linkedin: ctx.input.linkedin,
      notes: ctx.input.notes
    });

    let data = result.data || result;

    return {
      output: mapLead(data),
      message: `Created lead **${ctx.input.email}** in list **${ctx.input.listId}**.`
    };
  })
  .build();

export let updateLead = SlateTool.create(spec, {
  name: 'Update Lead',
  key: 'update_lead',
  description: `Update the fields of an existing lead by its ID. Only provide the fields you want to change.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      leadId: z.string().describe('The lead ID to update'),
      email: z.string().optional().describe('Updated email address'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      position: z.string().optional().describe('Updated job position'),
      company: z.string().optional().describe('Updated company name'),
      score: z.number().optional().describe('Updated lead score'),
      websiteUrl: z.string().optional().describe('Updated website URL'),
      phoneNumber: z.string().optional().describe('Updated phone number'),
      twitter: z.string().optional().describe('Updated Twitter handle'),
      country: z.string().optional().describe('Updated country'),
      linkedin: z.string().optional().describe('Updated LinkedIn profile URL'),
      notes: z.string().optional().describe('Updated notes')
    })
  )
  .output(leadOutputSchema)
  .handleInvocation(async ctx => {
    let client = new TombaClient({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let result = await client.updateLead(ctx.input.leadId, {
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      position: ctx.input.position,
      company: ctx.input.company,
      score: ctx.input.score,
      websiteUrl: ctx.input.websiteUrl,
      phoneNumber: ctx.input.phoneNumber,
      twitter: ctx.input.twitter,
      country: ctx.input.country,
      linkedin: ctx.input.linkedin,
      notes: ctx.input.notes
    });

    let data = result.data || result;

    return {
      output: mapLead(data),
      message: `Updated lead **${ctx.input.leadId}**.`
    };
  })
  .build();

export let deleteLead = SlateTool.create(spec, {
  name: 'Delete Lead',
  key: 'delete_lead',
  description: `Delete a lead by its ID. This action is permanent and cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      leadId: z.string().describe('The lead ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TombaClient({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    await client.deleteLead(ctx.input.leadId);

    return {
      output: {
        success: true
      },
      message: `Deleted lead **${ctx.input.leadId}**.`
    };
  })
  .build();
