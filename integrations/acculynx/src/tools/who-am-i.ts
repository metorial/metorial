import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let whoAmITool = SlateTool.create(spec, {
  name: 'Who Am I',
  key: 'who_am_i',
  description:
    'Identify the company connected by the API key. Returns its company ID, name, time zone information, and insurance setting.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      company: z
        .record(z.string(), z.any())
        .describe('The connected company identity and settings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let company = await client.getCompanySettings();
    return {
      output: { company },
      message: `Retrieved the connected company **${company.name ?? company.companyId ?? ''}**.`
    };
  })
  .build();
