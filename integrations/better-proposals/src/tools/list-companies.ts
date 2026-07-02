import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCompanies = SlateTool.create(spec, {
  name: 'List Companies',
  key: 'list_companies',
  description: `Retrieves all client companies in the account. Companies represent client organizations and are associated with proposals. Supports pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API'),
      companies: z.array(z.any()).describe('List of companies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listCompanies(ctx.input.page);
    let companies = Array.isArray(result.data)
      ? result.data
      : result.data
        ? [result.data]
        : [];

    return {
      output: {
        status: result.status ?? 'success',
        companies
      },
      message: `Retrieved ${companies.length} company(ies).`
    };
  })
  .build();
