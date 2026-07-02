import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let duplicateLead = SlateTool.create(spec, {
  name: 'Duplicate Lead',
  key: 'duplicate_lead',
  description: `Create a copy of an existing lead. Optionally place the duplicate into a specific pipeline step.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      leadId: z.number().describe('ID of the lead to duplicate'),
      step: z.string().optional().describe('Pipeline step name for the duplicated lead')
    })
  )
  .output(
    z.object({
      leadId: z.number().describe('ID of the new duplicated lead'),
      title: z.string().describe('Title of the new lead'),
      status: z.string().describe('Status of the new lead'),
      step: z.string().optional().describe('Pipeline step of the new lead'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let lead = await client.duplicateLead(ctx.input.leadId, ctx.input.step);

    return {
      output: {
        leadId: lead.id,
        title: lead.title,
        status: lead.status,
        step: lead.step,
        createdAt: lead.created_at
      },
      message: `Duplicated lead ${ctx.input.leadId} → new lead **"${lead.title}"** (ID: ${lead.id}).`
    };
  })
  .build();
