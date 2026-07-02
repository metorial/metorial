import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLeads = SlateTool.create(spec, {
  name: 'List Leads',
  key: 'list_leads',
  description: `List leads with optional filtering by date range and phone number. Returns lead details including contact info, status, tags, assigned team, and call history.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      start: z.string().optional().describe('Start date for filtering (YYYY-MM-DD)'),
      end: z.string().optional().describe('End date for filtering (YYYY-MM-DD)'),
      phoneNumber: z.string().optional().describe('Filter leads by phone number')
    })
  )
  .output(
    z.object({
      leads: z
        .array(
          z.object({
            leadId: z.string().describe('ID of the lead'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            email: z.string().optional().describe('Email address'),
            phoneNumber: z.string().optional().describe('Phone number'),
            company: z.string().optional().describe('Company name'),
            source: z.string().optional().describe('Lead source'),
            status: z.string().optional().describe('Lead status'),
            result: z.string().optional().describe('Lead result'),
            stage: z.string().optional().describe('Lead stage'),
            tags: z.any().optional().describe('Tags assigned to the lead'),
            createdAt: z.string().optional().describe('When the lead was created')
          })
        )
        .describe('List of leads')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let result = await client.listLeads({
      start: ctx.input.start,
      end: ctx.input.end,
      phoneNumber: ctx.input.phoneNumber
    });

    let leadsArray = Array.isArray(result) ? result : (result.leads ?? result.data ?? []);

    let leads = leadsArray.map((lead: any) => ({
      leadId: String(lead.id),
      firstName: lead.fname,
      lastName: lead.lname,
      email: lead.email,
      phoneNumber: lead.phone_number,
      company: lead.company,
      source: lead.source,
      status: lead.status,
      result: lead.result,
      stage: lead.stage,
      tags: lead.tags,
      createdAt: lead.created_at
    }));

    return {
      output: { leads },
      message: `Found **${leads.length}** lead(s).`
    };
  })
  .build();
