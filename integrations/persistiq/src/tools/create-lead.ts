import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createLead = SlateTool.create(spec, {
  name: 'Create Lead',
  key: 'create_lead',
  description: `Create a new lead (prospect) in PersistIQ. Provide contact details like email, name, company, and other fields. Optionally assign the lead to a specific user via their creator ID. Duplicate emails are silently skipped.`,
  instructions: [
    'The email field is required for creating a lead.',
    'If a lead with the same email already exists, the new record will not be added.'
  ]
})
  .input(
    z.object({
      email: z.string().describe('Email address of the lead (required)'),
      firstName: z.string().optional().describe('First name of the lead'),
      lastName: z.string().optional().describe('Last name of the lead'),
      companyName: z.string().optional().describe('Company name'),
      title: z.string().optional().describe('Job title'),
      industry: z.string().optional().describe('Industry'),
      phone: z.string().optional().describe('Phone number'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State'),
      linkedin: z.string().optional().describe('LinkedIn profile URL'),
      twitter: z.string().optional().describe('Twitter handle'),
      creatorId: z
        .string()
        .optional()
        .describe('ID of the user to assign as the owner of this lead'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom field key-value pairs')
    })
  )
  .output(
    z.object({
      leadId: z.string().describe('ID of the created lead'),
      email: z.string().optional().nullable().describe('Email address of the created lead'),
      firstName: z.string().optional().nullable().describe('First name'),
      lastName: z.string().optional().nullable().describe('Last name'),
      status: z.string().optional().nullable().describe('Lead status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let leadData: Record<string, unknown> = {
      email: ctx.input.email
    };

    if (ctx.input.firstName) leadData.first_name = ctx.input.firstName;
    if (ctx.input.lastName) leadData.last_name = ctx.input.lastName;
    if (ctx.input.companyName) leadData.company_name = ctx.input.companyName;
    if (ctx.input.title) leadData.title = ctx.input.title;
    if (ctx.input.industry) leadData.industry = ctx.input.industry;
    if (ctx.input.phone) leadData.phone = ctx.input.phone;
    if (ctx.input.city) leadData.city = ctx.input.city;
    if (ctx.input.state) leadData.state = ctx.input.state;
    if (ctx.input.linkedin) leadData.linkedin = ctx.input.linkedin;
    if (ctx.input.twitter) leadData.twitter = ctx.input.twitter;

    if (ctx.input.customFields) {
      for (let [key, value] of Object.entries(ctx.input.customFields)) {
        leadData[key] = value;
      }
    }

    let result = await client.createLeads([leadData], ctx.input.creatorId);

    let lead = result.leads?.[0] || {};

    return {
      output: {
        leadId: lead.id || '',
        email: lead.data?.email || ctx.input.email,
        firstName: lead.data?.first_name || ctx.input.firstName,
        lastName: lead.data?.last_name || ctx.input.lastName,
        status: lead.status
      },
      message: `Created lead **${ctx.input.firstName || ''} ${ctx.input.lastName || ''}** (${ctx.input.email}).`
    };
  })
  .build();
