import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLead = SlateTool.create(spec, {
  name: 'Get Lead',
  key: 'get_lead',
  description: `Retrieve detailed information about a specific lead including contact details, company info, status, tags, stage, assigned owner, team, and call history.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      leadId: z.string().describe('ID of the lead to retrieve')
    })
  )
  .output(
    z.object({
      leadId: z.string().describe('ID of the lead'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      phoneNumber: z.string().optional().describe('Phone number'),
      company: z.string().optional().describe('Company name'),
      category: z.string().optional().describe('Lead category'),
      source: z.string().optional().describe('Lead source'),
      status: z.string().optional().describe('Lead status'),
      result: z.string().optional().describe('Lead result'),
      stage: z.string().optional().describe('Lead stage'),
      tags: z.any().optional().describe('Tags assigned to the lead'),
      leadOwner: z.record(z.string(), z.any()).optional().describe('Assigned lead owner'),
      team: z.record(z.string(), z.any()).optional().describe('Assigned team'),
      calls: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Call history for this lead'),
      isStopped: z.boolean().optional().describe('Whether calls to this lead are stopped'),
      isBlocked: z.boolean().optional().describe('Whether this lead is blocked'),
      createdAt: z.string().optional().describe('When the lead was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let lead = await client.getLead(ctx.input.leadId);

    return {
      output: {
        leadId: String(lead.id),
        firstName: lead.fname,
        lastName: lead.lname,
        email: lead.email,
        phoneNumber: lead.phone_number,
        company: lead.company,
        category: lead.category,
        source: lead.source,
        status: lead.status,
        result: lead.result,
        stage: lead.stage,
        tags: lead.tags,
        leadOwner: lead.lead_owner,
        team: lead.team,
        calls: lead.calls,
        isStopped: lead.is_stopped,
        isBlocked: lead.is_blocked,
        createdAt: lead.created_at
      },
      message: `Lead **${lead.fname ?? ''} ${lead.lname ?? ''}** (${lead.phone_number ?? 'no phone'}) — status: ${lead.status ?? 'unknown'}.`
    };
  })
  .build();
