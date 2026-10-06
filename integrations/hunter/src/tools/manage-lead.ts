import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, entity, id } from '../lib/client';
import { leadOutputSchema, mapLead } from '../lib/lead';
import { spec } from '../spec';

export let manageLead = SlateTool.create(spec, {
  name: 'Manage Lead',
  key: 'manage_lead',
  description: `Create, update, or upsert a lead in Hunter. Supports saving a lead, updating an existing lead by ID, or upserting by email address with contact details and company information.`,
  instructions: [
    'To **create** a lead, set action to "create" and provide at least an email. Hunter deduplicates saved leads by email; this does not guarantee a new resource.',
    'To **update** an existing lead, set action to "update" and provide the leadId along with fields to change.',
    'To **upsert** (create or update by email), set action to "upsert" and provide an email — if a lead with that email exists it will be updated, otherwise a new lead will be created.'
  ],
  tags: {
    destructive: true
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
    const client = new Client({ token: ctx.auth.token });
    const data = pickDefined({
      email: ctx.input.email,
      first_name: ctx.input.firstName,
      last_name: ctx.input.lastName,
      position: ctx.input.position,
      company: ctx.input.company,
      company_industry: ctx.input.companyIndustry,
      company_size:
        ctx.input.companySize === undefined ? undefined : String(ctx.input.companySize),
      website: ctx.input.website,
      country_code: ctx.input.countryCode,
      linkedin_url: ctx.input.linkedinUrl,
      phone_number: ctx.input.phoneNumber,
      twitter: ctx.input.twitter,
      notes: ctx.input.notes,
      leads_list_id: ctx.input.leadListId
    });
    const result =
      ctx.input.action === 'create'
        ? await client.createLead(data)
        : ctx.input.action === 'update'
          ? await client.updateLead(id(ctx.input.leadId), data)
          : await client.upsertLead(data);
    const lead = entity(
      result.data,
      ctx.input.action === 'update' ? ctx.input.leadId : undefined
    );
    return {
      output: mapLead(lead),
      message: `Lead **${lead.id}** has been ${ctx.input.action === 'create' ? 'saved' : ctx.input.action === 'update' ? 'updated' : 'upserted'}.`
    };
  })
  .build();
