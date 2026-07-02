import { SlateTool } from 'slates';
import { z } from 'zod';
import { HelloLeadsClient } from '../lib/client';
import { spec } from '../spec';

export let createLead = SlateTool.create(spec, {
  name: 'Create Lead',
  key: 'create_lead',
  description: `Create a new lead in HelloLeads CRM. Requires a first name and either an email or mobile number. The lead can be assigned to a specific list using the list key.`,
  instructions: [
    'Either email or mobile number must be provided.',
    'Use the Get Lists tool to find valid list keys before assigning a lead to a list.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      firstName: z.string().describe('First name of the lead (required)'),
      lastName: z.string().optional().describe('Last name of the lead'),
      email: z.string().optional().describe('Email address of the lead'),
      mobile: z.string().optional().describe('Mobile phone number'),
      mobileCode: z.string().optional().describe('Country code for mobile number (e.g. "+1")'),
      phone: z.string().optional().describe('Direct or office phone number'),
      fax: z.string().optional().describe('Fax number'),
      organization: z.string().optional().describe('Company or organization name'),
      designation: z.string().optional().describe('Job title or designation'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State or province'),
      country: z.string().optional().describe('Country'),
      zip: z.string().optional().describe('Postal/ZIP code'),
      website: z.string().optional().describe('Website URL'),
      notes: z.string().optional().describe('Notes about the lead'),
      interests: z.string().optional().describe('Lead interests or product group'),
      category: z.string().optional().describe('Customer group or category'),
      tags: z.string().optional().describe('Comma-separated tags for the lead'),
      dealSize: z.string().optional().describe('Estimated deal size value'),
      potential: z
        .string()
        .optional()
        .describe('Lead potential rating (e.g. Low, Medium, High)'),
      listKey: z
        .string()
        .optional()
        .describe(
          'Key of the list to add the lead to. Use the Get Lists tool to find available list keys.'
        )
    })
  )
  .output(
    z.object({
      leadId: z.string().describe('Unique identifier of the newly created lead'),
      firstName: z.string().describe('First name of the created lead'),
      lastName: z.string().optional().describe('Last name of the created lead'),
      email: z.string().optional().describe('Email address of the created lead'),
      mobile: z.string().optional().describe('Mobile phone number of the created lead'),
      organization: z.string().optional().describe('Organization of the created lead')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HelloLeadsClient({
      token: ctx.auth.token,
      email: ctx.auth.email
    });

    let result = await client.createLead({
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      email: ctx.input.email,
      mobile: ctx.input.mobile,
      mobileCode: ctx.input.mobileCode,
      phone: ctx.input.phone,
      fax: ctx.input.fax,
      organization: ctx.input.organization,
      designation: ctx.input.designation,
      address: ctx.input.address,
      city: ctx.input.city,
      state: ctx.input.state,
      country: ctx.input.country,
      zip: ctx.input.zip,
      website: ctx.input.website,
      notes: ctx.input.notes,
      interests: ctx.input.interests,
      category: ctx.input.category,
      tags: ctx.input.tags,
      dealSize: ctx.input.dealSize,
      potential: ctx.input.potential,
      listKey: ctx.input.listKey
    });

    let lead = result?.data ?? result?.lead ?? result ?? {};
    let leadId = String(lead.lead_id ?? lead.id ?? '');

    return {
      output: {
        leadId,
        firstName: ctx.input.firstName,
        lastName: ctx.input.lastName,
        email: ctx.input.email,
        mobile: ctx.input.mobile,
        organization: ctx.input.organization
      },
      message: `Successfully created lead **${ctx.input.firstName}${ctx.input.lastName ? ` ${ctx.input.lastName}` : ''}** (ID: ${leadId}).`
    };
  })
  .build();
