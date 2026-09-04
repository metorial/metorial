import { SlateTool } from 'slates';
import { z } from 'zod';
import { CompaniesHouseClient } from '../lib/client';
import { companyInsolvencyOutputSchema, companyNumberSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getCompanyInsolvency = SlateTool.create(spec, {
  name: 'Get Company Insolvency',
  key: 'get_company_insolvency',
  description:
    'Get Companies House insolvency cases for a company, including provider-published dates, notes, and practitioners.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      companyNumber: companyNumberSchema.describe('Companies House company number.')
    })
  )
  .output(companyInsolvencyOutputSchema)
  .handleInvocation(async ctx => {
    let result = await new CompaniesHouseClient(ctx.auth).getCompanyInsolvency(
      ctx.input.companyNumber
    );
    return {
      output: result,
      message: `Found **${result.cases.length}** insolvency cases for company **${result.companyNumber}**.`
    };
  })
  .build();
