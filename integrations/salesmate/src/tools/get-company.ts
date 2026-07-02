import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getCompany = SlateTool.create(spec, {
  name: 'Get Company',
  key: 'get_company',
  description: `Retrieve a company by its ID from Salesmate. Returns all fields including custom fields for the specified company.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      companyId: z.string().describe('ID of the company to retrieve')
    })
  )
  .output(
    z.object({
      company: z
        .record(z.string(), z.unknown())
        .describe('Full company record with all fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getCompany(ctx.input.companyId);
    let company = result?.Data ?? result;

    return {
      output: { company },
      message: `Retrieved company \`${ctx.input.companyId}\`.`
    };
  })
  .build();
