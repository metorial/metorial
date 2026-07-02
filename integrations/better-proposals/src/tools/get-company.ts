import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCompany = SlateTool.create(spec, {
  name: 'Get Company',
  key: 'get_company',
  description: `Retrieves detailed information about a specific company by its ID. Companies represent client organizations associated with proposals.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companyId: z.string().describe('The unique ID of the company to retrieve')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API'),
      company: z.any().describe('Full company details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCompany(ctx.input.companyId);

    return {
      output: {
        status: result.status ?? 'success',
        company: result.data
      },
      message: `Retrieved company **${ctx.input.companyId}**.`
    };
  })
  .build();
