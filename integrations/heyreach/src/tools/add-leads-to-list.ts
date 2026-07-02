import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let leadSchema = z.object({
  profileUrl: z.string().describe('LinkedIn profile URL of the lead (required)'),
  firstName: z.string().optional().describe('First name of the lead'),
  lastName: z.string().optional().describe('Last name of the lead'),
  location: z.string().optional().describe('Location of the lead'),
  companyName: z.string().optional().describe('Company name of the lead'),
  position: z.string().optional().describe('Job title/position of the lead'),
  emailAddress: z.string().optional().describe('Email address of the lead'),
  summary: z.string().optional().describe('Brief summary of the lead'),
  about: z.string().optional().describe('Additional information about the lead'),
  customUserFields: z
    .array(
      z.object({
        name: z.string().describe('Custom field name'),
        value: z.string().describe('Custom field value')
      })
    )
    .optional()
    .describe('Custom personalization fields')
});

export let addLeadsToList = SlateTool.create(spec, {
  name: 'Add Leads to List',
  key: 'add_leads_to_list',
  description: `Add leads with personalization data to an existing HeyReach lead list. Useful for building lead lists before assigning them to campaigns.`,
  constraints: ['Maximum of 100 leads per request.']
})
  .input(
    z.object({
      listId: z.number().describe('The ID of the list to add leads to'),
      leads: z.array(leadSchema).min(1).max(100).describe('Array of leads to add (1-100)')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Result of the add leads operation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.addLeadsToList(ctx.input.listId, ctx.input.leads);

    return {
      output: { result: result?.data ?? result },
      message: `Added **${ctx.input.leads.length}** lead(s) to list **${ctx.input.listId}**.`
    };
  })
  .build();
