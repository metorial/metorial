import { SlateTool } from 'slates';
import { z } from 'zod';
import { HelloLeadsClient } from '../lib/client';
import { spec } from '../spec';

let leadSchema = z.object({
  leadId: z.string().describe('Unique identifier of the lead'),
  firstName: z.string().describe('First name of the lead'),
  lastName: z.string().optional().describe('Last name of the lead'),
  email: z.string().optional().describe('Email address of the lead'),
  mobile: z.string().optional().describe('Mobile phone number'),
  phone: z.string().optional().describe('Direct/office phone number'),
  organization: z.string().optional().describe('Company or organization name'),
  designation: z.string().optional().describe('Job title or designation'),
  address: z.string().optional().describe('Street address'),
  city: z.string().optional().describe('City'),
  state: z.string().optional().describe('State or province'),
  country: z.string().optional().describe('Country'),
  zip: z.string().optional().describe('Postal/ZIP code'),
  website: z.string().optional().describe('Website URL'),
  potential: z.string().optional().describe('Lead potential rating (e.g. Low, Medium, High)'),
  dealSize: z.string().optional().describe('Estimated deal size'),
  tags: z.string().optional().describe('Tags associated with the lead'),
  notes: z.string().optional().describe('Notes about the lead'),
  createdAt: z.string().optional().describe('Timestamp when the lead was created')
});

export let getLeads = SlateTool.create(spec, {
  name: 'Get Leads',
  key: 'get_leads',
  description: `Retrieve leads from HelloLeads CRM. Returns a paginated list of leads with their contact information, qualifiers, and metadata. Use the page and limit parameters to control pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      limit: z.number().optional().describe('Number of leads per page (max 100)')
    })
  )
  .output(
    z.object({
      leads: z.array(leadSchema).describe('List of leads'),
      count: z.number().describe('Number of leads returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HelloLeadsClient({
      token: ctx.auth.token,
      email: ctx.auth.email
    });

    let result = await client.listLeads({
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let rawLeads = Array.isArray(result) ? result : (result?.data ?? result?.leads ?? []);

    let leads = (rawLeads as any[]).map((lead: any) => ({
      leadId: String(lead.id ?? lead.lead_id ?? ''),
      firstName: String(lead.first_name ?? ''),
      lastName: lead.last_name || undefined,
      email: lead.email || undefined,
      mobile: lead.mobile || undefined,
      phone: lead.phone || undefined,
      organization: lead.organization ?? lead.company ?? undefined,
      designation: lead.designation || undefined,
      address: lead.address || undefined,
      city: lead.city || undefined,
      state: lead.state || undefined,
      country: lead.country || undefined,
      zip: lead.zip ?? lead.postal_code ?? undefined,
      website: lead.website || undefined,
      potential: lead.potential || undefined,
      dealSize: lead.deal_size ? String(lead.deal_size) : undefined,
      tags: lead.tags || undefined,
      notes: lead.notes || undefined,
      createdAt: lead.created_at ?? lead.createdAt ?? undefined
    }));

    return {
      output: {
        leads,
        count: leads.length
      },
      message: `Retrieved **${leads.length}** lead(s) from HelloLeads.`
    };
  })
  .build();
