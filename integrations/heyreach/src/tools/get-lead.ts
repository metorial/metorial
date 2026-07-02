import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLead = SlateTool.create(spec, {
  name: 'Get Lead',
  key: 'get_lead',
  description: `Retrieve detailed information about a lead by their LinkedIn profile URL. Returns the lead's profile data, campaign associations, and any custom fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      profileUrl: z
        .string()
        .describe('LinkedIn profile URL of the lead (e.g., "https://linkedin.com/in/example")')
    })
  )
  .output(
    z.object({
      lead: z.any().describe('Detailed lead profile information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getLeadDetails(ctx.input.profileUrl);
    let lead = result?.data ?? result;

    return {
      output: { lead },
      message: `Retrieved lead details for **${ctx.input.profileUrl}**.`
    };
  })
  .build();
