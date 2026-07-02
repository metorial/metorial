import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let leadOutputSchema = z.object({
  leadId: z.number().describe('Lead ID'),
  email: z.string().nullable().describe('Email address'),
  firstName: z.string().nullable().describe('First name'),
  lastName: z.string().nullable().describe('Last name'),
  position: z.string().nullable().describe('Job position'),
  company: z.string().nullable().describe('Company name'),
  companyIndustry: z.string().nullable().describe('Company industry'),
  companySize: z.string().nullable().describe('Company size'),
  website: z.string().nullable().describe('Website URL'),
  countryCode: z.string().nullable().describe('Country code'),
  linkedinUrl: z.string().nullable().describe('LinkedIn URL'),
  phoneNumber: z.string().nullable().describe('Phone number'),
  twitter: z.string().nullable().describe('Twitter handle'),
  notes: z.string().nullable().describe('Notes'),
  verificationStatus: z.string().nullable().describe('Email verification status')
});

let mapLead = (lead: any) => ({
  leadId: lead.id,
  email: lead.email ?? null,
  firstName: lead.first_name ?? null,
  lastName: lead.last_name ?? null,
  position: lead.position ?? null,
  company: lead.company ?? null,
  companyIndustry: lead.company_industry ?? null,
  companySize: lead.company_size?.toString() ?? null,
  website: lead.website ?? null,
  countryCode: lead.country_code ?? null,
  linkedinUrl: lead.linkedin_url ?? null,
  phoneNumber: lead.phone_number ?? null,
  twitter: lead.twitter ?? null,
  notes: lead.notes ?? null,
  verificationStatus: lead.verification?.status ?? null
});

export let manageLead = SlateTool.create(spec, {
  name: 'Manage Lead',
  key: 'manage_lead',
  description: `Create, update, or upsert a lead in Hunter. Supports creating a new lead, updating an existing lead by ID, or upserting (create or update) by email address. Leads can include contact details, company information, and custom attributes.`,
  instructions: [
    'To **create** a new lead, set action to "create" and provide at least an email.',
    'To **update** an existing lead, set action to "update" and provide the leadId along with fields to change.',
    'To **upsert** (create or update by email), set action to "upsert" and provide an email — if a lead with that email exists it will be updated, otherwise a new lead will be created.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'upsert']).describe('Action to perform'),
      leadId: z.number().optional().describe('Lead ID (required for "update" action)'),
      email: z
        .string()
        .optional()
        .describe('Email address (required for "create" and "upsert")'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      position: z.string().optional().describe('Job position'),
      company: z.string().optional().describe('Company name'),
      companyIndustry: z.string().optional().describe('Company industry'),
      companySize: z.number().optional().describe('Company size (number of employees)'),
      website: z.string().optional().describe('Company website'),
      countryCode: z.string().optional().describe('Two-letter country code'),
      linkedinUrl: z.string().optional().describe('LinkedIn URL'),
      phoneNumber: z.string().optional().describe('Phone number'),
      twitter: z.string().optional().describe('Twitter handle'),
      notes: z.string().optional().describe('Notes about the lead'),
      leadListId: z.number().optional().describe('Lead list ID to assign the lead to')
    })
  )
  .output(leadOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, any> = {};
    if (ctx.input.email) data.email = ctx.input.email;
    if (ctx.input.firstName) data.first_name = ctx.input.firstName;
    if (ctx.input.lastName) data.last_name = ctx.input.lastName;
    if (ctx.input.position) data.position = ctx.input.position;
    if (ctx.input.company) data.company = ctx.input.company;
    if (ctx.input.companyIndustry) data.company_industry = ctx.input.companyIndustry;
    if (ctx.input.companySize !== undefined) data.company_size = ctx.input.companySize;
    if (ctx.input.website) data.website = ctx.input.website;
    if (ctx.input.countryCode) data.country_code = ctx.input.countryCode;
    if (ctx.input.linkedinUrl) data.linkedin_url = ctx.input.linkedinUrl;
    if (ctx.input.phoneNumber) data.phone_number = ctx.input.phoneNumber;
    if (ctx.input.twitter) data.twitter = ctx.input.twitter;
    if (ctx.input.notes) data.notes = ctx.input.notes;
    if (ctx.input.leadListId) data.lead_list_id = ctx.input.leadListId;

    let result: any;
    if (ctx.input.action === 'create') {
      result = await client.createLead(data);
    } else if (ctx.input.action === 'update') {
      if (!ctx.input.leadId) throw new Error('leadId is required for update action');
      result = await client.updateLead(ctx.input.leadId, data);
    } else {
      result = await client.upsertLead(data);
    }

    let lead = result.data;

    return {
      output: mapLead(lead),
      message: `Lead **${lead.email ?? lead.id}** has been ${ctx.input.action === 'create' ? 'created' : ctx.input.action === 'update' ? 'updated' : 'upserted'}.`
    };
  })
  .build();
