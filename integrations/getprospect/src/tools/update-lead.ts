import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateLead = SlateTool.create(spec, {
  name: 'Update Lead',
  key: 'update_lead',
  description: `Update an existing lead in GetProspect. Provide the lead ID and any fields to update. Only specified fields will be modified.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      leadId: z.string().describe('ID of the lead to update'),
      email: z.string().optional().describe('New email address'),
      firstName: z.string().optional().describe('New first name'),
      lastName: z.string().optional().describe('New last name'),
      companyName: z.string().optional().describe('New company name'),
      companyUrl: z.string().optional().describe('New company website URL'),
      title: z.string().optional().describe('New job title'),
      phone: z.string().optional().describe('New phone number'),
      linkedin: z.string().optional().describe('New LinkedIn profile URL'),
      twitter: z.string().optional().describe('New Twitter handle'),
      notes: z.string().optional().describe('New notes')
    })
  )
  .output(
    z.object({
      leadId: z.string().optional().describe('ID of the updated lead'),
      email: z.string().optional().describe('Email address'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      companyName: z.string().optional().describe('Company name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.updateLead(ctx.input.leadId, {
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      companyName: ctx.input.companyName,
      companyUrl: ctx.input.companyUrl,
      title: ctx.input.title,
      phone: ctx.input.phone,
      linkedin: ctx.input.linkedin,
      twitter: ctx.input.twitter,
      notes: ctx.input.notes
    });

    return {
      output: {
        leadId: result.id ?? result.lead_id ?? ctx.input.leadId,
        email: result.email,
        firstName: result.first_name,
        lastName: result.last_name,
        companyName: result.company_name
      },
      message: `Updated lead **${ctx.input.leadId}**.`
    };
  })
  .build();
