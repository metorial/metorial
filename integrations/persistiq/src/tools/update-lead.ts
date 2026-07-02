import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateLead = SlateTool.create(spec, {
  name: 'Update Lead',
  key: 'update_lead',
  description: `Update an existing lead's contact information and custom fields, or change their status. Combine data updates and status changes in a single operation.`,
  instructions: [
    'Status values must already be configured in the PersistIQ dashboard before they can be set via this tool.'
  ]
})
  .input(
    z.object({
      leadId: z.string().describe('ID of the lead to update (e.g. l_1abc)'),
      email: z.string().optional().describe('Updated email address'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      companyName: z.string().optional().describe('Updated company name'),
      title: z.string().optional().describe('Updated job title'),
      industry: z.string().optional().describe('Updated industry'),
      phone: z.string().optional().describe('Updated phone number'),
      city: z.string().optional().describe('Updated city'),
      state: z.string().optional().describe('Updated state'),
      linkedin: z.string().optional().describe('Updated LinkedIn profile URL'),
      twitter: z.string().optional().describe('Updated Twitter handle'),
      status: z
        .string()
        .optional()
        .describe('New status for the lead (must be pre-configured in PersistIQ)'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom field key-value pairs to update')
    })
  )
  .output(
    z.object({
      leadId: z.string().describe('ID of the updated lead'),
      status: z.string().optional().nullable().describe('Current status of the lead'),
      email: z.string().optional().nullable().describe('Email address'),
      firstName: z.string().optional().nullable().describe('First name'),
      lastName: z.string().optional().nullable().describe('Last name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, unknown> = {};
    if (ctx.input.email) data.email = ctx.input.email;
    if (ctx.input.firstName) data.first_name = ctx.input.firstName;
    if (ctx.input.lastName) data.last_name = ctx.input.lastName;
    if (ctx.input.companyName) data.company_name = ctx.input.companyName;
    if (ctx.input.title) data.title = ctx.input.title;
    if (ctx.input.industry) data.industry = ctx.input.industry;
    if (ctx.input.phone) data.phone = ctx.input.phone;
    if (ctx.input.city) data.city = ctx.input.city;
    if (ctx.input.state) data.state = ctx.input.state;
    if (ctx.input.linkedin) data.linkedin = ctx.input.linkedin;
    if (ctx.input.twitter) data.twitter = ctx.input.twitter;

    if (ctx.input.customFields) {
      for (let [key, value] of Object.entries(ctx.input.customFields)) {
        data[key] = value;
      }
    }

    // If status is provided, update it via the separate status mechanism
    if (ctx.input.status) {
      await client.updateProspectStatus(ctx.input.leadId, ctx.input.status);
    }

    // Update lead data fields if any were provided
    if (Object.keys(data).length > 0) {
      await client.updateLead(ctx.input.leadId, data);
    }

    // Fetch the updated lead to return current state
    let result = await client.getLead(ctx.input.leadId);
    let lead = result.leads?.[0] || result;

    return {
      output: {
        leadId: lead.id || ctx.input.leadId,
        status: lead.status,
        email: lead.data?.email,
        firstName: lead.data?.first_name,
        lastName: lead.data?.last_name
      },
      message: `Updated lead **${lead.data?.first_name || ''} ${lead.data?.last_name || ''}** (${ctx.input.leadId}).`
    };
  })
  .build();
