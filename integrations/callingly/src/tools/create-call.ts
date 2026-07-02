import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCall = SlateTool.create(spec, {
  name: 'Create Call',
  key: 'create_call',
  description: `Initiate a phone call to a lead by assigning it to a team. The call can be placed immediately or scheduled for a future time using the **scheduledAt** parameter. Creates or matches a lead with the provided contact details and triggers the team's call flow.`,
  instructions: [
    'Provide at minimum a phone number and team ID to initiate a call.',
    'Use scheduledAt in ISO 8601 format (e.g., "2024-06-15T14:30:00Z") to schedule a future call.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      teamId: z.string().describe('ID of the team to assign the call to'),
      phoneNumber: z
        .string()
        .describe('Phone number of the lead to call, preferably in E.164 format'),
      firstName: z.string().optional().describe('First name of the lead'),
      lastName: z.string().optional().describe('Last name of the lead'),
      email: z.string().optional().describe('Email address of the lead'),
      company: z.string().optional().describe('Company name of the lead'),
      category: z.string().optional().describe('Category for the lead'),
      source: z.string().optional().describe('Source where the lead originated'),
      crmId: z.string().optional().describe('CRM identifier for the lead'),
      scheduledAt: z
        .string()
        .optional()
        .describe('ISO 8601 datetime to schedule the call for a future time')
    })
  )
  .output(
    z.object({
      callId: z.string().describe('ID of the created call'),
      leadId: z.string().optional().describe('ID of the associated lead'),
      status: z.string().optional().describe('Current status of the call'),
      scheduledAt: z.string().optional().describe('Scheduled time for the call if applicable')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let result = await client.createCall({
      teamId: ctx.input.teamId,
      phoneNumber: ctx.input.phoneNumber,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      email: ctx.input.email,
      company: ctx.input.company,
      category: ctx.input.category,
      source: ctx.input.source,
      crmId: ctx.input.crmId,
      scheduledAt: ctx.input.scheduledAt
    });

    return {
      output: {
        callId: String(result.id ?? result.call_id ?? ''),
        leadId: result.lead_id ? String(result.lead_id) : undefined,
        status: result.status,
        scheduledAt: result.scheduled_at
      },
      message: ctx.input.scheduledAt
        ? `Call scheduled for ${ctx.input.scheduledAt} to **${ctx.input.phoneNumber}** via team **${ctx.input.teamId}**.`
        : `Call initiated to **${ctx.input.phoneNumber}** via team **${ctx.input.teamId}**.`
    };
  })
  .build();
