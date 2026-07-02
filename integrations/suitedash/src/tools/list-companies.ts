import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCompanies = SlateTool.create(spec, {
  name: 'List Companies',
  key: 'list_companies',
  description: `Retrieves companies from SuiteDash CRM. Returns a paginated list of companies. Specify a page number to navigate through results, or fetch all companies at once.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z
        .number()
        .optional()
        .describe('Page number to retrieve (starts at 1). If omitted, returns all companies.')
    })
  )
  .output(
    z.object({
      companies: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of company records'),
      totalPages: z.number().optional().describe('Total number of pages available'),
      total: z.number().optional().describe('Total number of companies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      publicId: ctx.auth.publicId,
      secretKey: ctx.auth.secretKey
    });

    if (ctx.input.page !== undefined) {
      let response = await client.listCompanies(ctx.input.page);
      return {
        output: {
          companies: response.data,
          totalPages: response.meta?.pagination?.totalPages,
          total: response.meta?.pagination?.total
        },
        message: `Retrieved **${response.data.length}** companies (page ${ctx.input.page} of ${response.meta?.pagination?.totalPages ?? 1}).`
      };
    }

    let companies = await client.listAllCompanies();
    return {
      output: {
        companies,
        totalPages: undefined,
        total: companies.length
      },
      message: `Retrieved all **${companies.length}** companies.`
    };
  })
  .build();
