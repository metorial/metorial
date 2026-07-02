import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let genderLookup = SlateTool.create(spec, {
  name: 'Gender Lookup',
  key: 'gender_lookup',
  description: `Determine the probable gender associated with a first name. Returns the gender and the percentage of instances where the name is associated with that gender. Useful for demographic analysis and personalization.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().describe('First name to check gender for')
    })
  )
  .output(
    z.object({
      name: z.string().optional().describe('The name that was checked'),
      gender: z.string().optional().describe('Probable gender ("M" or "F")'),
      genderPercent: z
        .string()
        .optional()
        .describe('Percentage of instances where the name is associated with this gender')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let raw = await client.genderLookup(ctx.input.name);

    let result = {
      name: raw.name || ctx.input.name,
      gender: raw.gender,
      genderPercent: raw.gender_prcnt || raw.gender_percent
    };

    return {
      output: result,
      message: `Gender lookup for **${ctx.input.name}**: **${result.gender || 'Unknown'}** (${result.genderPercent || 'N/A'}% confidence).`
    };
  })
  .build();
