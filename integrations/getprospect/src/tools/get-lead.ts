import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let leadOutputSchema = z.object({
  leadId: z.string().optional().describe('Unique identifier for the lead'),
  email: z.string().optional().describe('Email address'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  companyName: z.string().optional().describe('Company name'),
  companyUrl: z.string().optional().describe('Company website URL'),
  title: z.string().optional().describe('Job title'),
  phone: z.string().optional().describe('Phone number'),
  linkedin: z.string().optional().describe('LinkedIn profile URL'),
  twitter: z.string().optional().describe('Twitter handle'),
  notes: z.string().optional().describe('Notes about the lead')
});

export let getLead = SlateTool.create(spec, {
  name: 'Get Lead',
  key: 'get_lead',
  description: `Retrieve a single lead by its ID. Returns the full lead record including contact details, company info, and social profiles.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      leadId: z.string().describe('ID of the lead to retrieve')
    })
  )
  .output(leadOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getLead(ctx.input.leadId);

    return {
      output: {
        leadId: result.id ?? result.lead_id,
        email: result.email,
        firstName: result.first_name,
        lastName: result.last_name,
        companyName: result.company_name,
        companyUrl: result.company_url,
        title: result.title,
        phone: result.phone,
        linkedin: result.linkedin,
        twitter: result.twitter,
        notes: result.notes
      },
      message: `Retrieved lead **${result.first_name ?? ''} ${result.last_name ?? ''}** (${result.email ?? 'no email'}).`
    };
  })
  .build();
