import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createLead = SlateTool.create(spec, {
  name: 'Create Lead',
  key: 'create_lead',
  description: `Create a new lead (contact) in GetProspect. At minimum, provide an email or a name. Returns the newly created lead record.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Email address of the lead'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      companyName: z.string().optional().describe('Company name'),
      companyUrl: z.string().optional().describe('Company website URL'),
      title: z.string().optional().describe('Job title'),
      phone: z.string().optional().describe('Phone number'),
      linkedin: z.string().optional().describe('LinkedIn profile URL'),
      twitter: z.string().optional().describe('Twitter handle'),
      notes: z.string().optional().describe('Notes about the lead')
    })
  )
  .output(
    z.object({
      leadId: z.string().optional().describe('ID of the newly created lead'),
      email: z.string().optional().describe('Email address'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      companyName: z.string().optional().describe('Company name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createLead({
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
        leadId: result.id ?? result.lead_id,
        email: result.email ?? ctx.input.email,
        firstName: result.first_name ?? ctx.input.firstName,
        lastName: result.last_name ?? ctx.input.lastName,
        companyName: result.company_name ?? ctx.input.companyName
      },
      message: `Created lead **${ctx.input.firstName ?? ''} ${ctx.input.lastName ?? ''}** (${ctx.input.email ?? 'no email'}).`
    };
  })
  .build();
