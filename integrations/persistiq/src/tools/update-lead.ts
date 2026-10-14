import { createApiServiceError, SlateTool } from 'slates';
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
      leadId: z
        .string()
        .describe('Lead ID or email address. Call list_leads to find lead IDs.'),
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
      statusId: z
        .string()
        .optional()
        .describe('Lead status ID from list_lead_statuses; use either status or statusId'),
      ownerId: z.string().optional().describe('New owner user ID from list_users'),
      bounced: z.boolean().optional().describe('Whether emails to this lead have bounced'),
      optedOut: z.boolean().optional().describe('Whether the lead has opted out of outreach'),
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
    if (ctx.input.email !== undefined) data.email = ctx.input.email;
    if (ctx.input.firstName !== undefined) data.first_name = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) data.last_name = ctx.input.lastName;
    if (ctx.input.companyName !== undefined) data.company_name = ctx.input.companyName;
    if (ctx.input.title !== undefined) data.title = ctx.input.title;
    if (ctx.input.industry !== undefined) data.industry = ctx.input.industry;
    if (ctx.input.phone !== undefined) data.phone = ctx.input.phone;
    if (ctx.input.city !== undefined) data.city = ctx.input.city;
    if (ctx.input.state !== undefined) data.state = ctx.input.state;
    if (ctx.input.linkedin !== undefined) data.linkedin = ctx.input.linkedin;
    if (ctx.input.twitter !== undefined) data.twitter = ctx.input.twitter;

    if (ctx.input.customFields) {
      for (let [key, value] of Object.entries(ctx.input.customFields)) {
        data[key] = value;
      }
    }

    if (ctx.input.status !== undefined && ctx.input.statusId !== undefined) {
      throw createApiServiceError(
        'Provide either status or statusId, not both. Call list_lead_statuses to choose a status.'
      );
    }
    if (
      Object.keys(data).length === 0 &&
      ctx.input.status === undefined &&
      ctx.input.statusId === undefined &&
      ctx.input.ownerId === undefined &&
      ctx.input.bounced === undefined &&
      ctx.input.optedOut === undefined
    ) {
      throw createApiServiceError(
        'Provide at least one lead field, status, owner, bounce state, or opt-out state to update.'
      );
    }
    let result = await client.updateLead(ctx.input.leadId, {
      data: Object.keys(data).length ? data : undefined,
      status: ctx.input.status,
      status_id: ctx.input.statusId,
      owner_id: ctx.input.ownerId,
      bounced: ctx.input.bounced,
      optedout: ctx.input.optedOut
    });
    let lead = result.lead || result.leads?.[0];
    if (!lead?.id)
      throw createApiServiceError(
        'PersistIQ accepted the update without returning a lead ID. Call get_lead to check the current state before retrying.'
      );

    return {
      output: {
        leadId: lead.id,
        status: lead.status,
        email: lead.data?.email,
        firstName: lead.data?.first_name,
        lastName: lead.data?.last_name
      },
      message: `Updated lead **${lead.data?.first_name || ''} ${lead.data?.last_name || ''}** (${ctx.input.leadId}).`
    };
  })
  .build();
