import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createLead = SlateTool.create(spec, {
  name: 'Create Lead',
  key: 'create_lead',
  description: `Create a new lead in noCRM.io. Leads can be assigned to a user, tagged, and placed in a specific pipeline step. The description field supports structured data with fields like name, email, phone, etc.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Title of the lead'),
      description: z
        .string()
        .optional()
        .describe(
          'Lead description with structured fields (e.g. "First name: John\\nLast name: Doe\\nEmail: john@example.com")'
        ),
      userId: z.number().optional().describe('ID of the user to assign this lead to'),
      tags: z.array(z.string()).optional().describe('Tags to attach to the lead'),
      step: z.string().optional().describe('Pipeline step name to place the lead in'),
      createdAt: z.string().optional().describe('Custom creation date in ISO 8601 format')
    })
  )
  .output(
    z.object({
      leadId: z.number().describe('ID of the created lead'),
      title: z.string().describe('Title of the lead'),
      status: z.string().describe('Current status of the lead'),
      step: z.string().optional().describe('Pipeline step the lead is in'),
      userId: z.number().optional().describe('ID of the assigned user'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let lead = await client.createLead({
      title: ctx.input.title,
      description: ctx.input.description,
      userId: ctx.input.userId,
      tags: ctx.input.tags,
      step: ctx.input.step,
      createdAt: ctx.input.createdAt
    });

    return {
      output: {
        leadId: lead.id,
        title: lead.title,
        status: lead.status,
        step: lead.step,
        userId: lead.user_id,
        createdAt: lead.created_at
      },
      message: `Created lead **"${lead.title}"** (ID: ${lead.id}) with status "${lead.status}"${lead.step ? ` in step "${lead.step}"` : ''}.`
    };
  })
  .build();
