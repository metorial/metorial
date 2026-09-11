import { SlateTool } from 'slates';
import { z } from 'zod';
import { CompaniesHouseClient } from '../lib/client';
import {
  companyNumberSchema,
  paginationFields,
  pscListOutputSchema,
  pscStatementListOutputSchema
} from '../lib/schemas';
import { spec } from '../spec';

let registerViewSchema = z
  .boolean()
  .default(false)
  .describe('Whether to request Companies House register-view filtering.');

export let listCompanyPscs = SlateTool.create(spec, {
  name: 'List Company PSCs',
  key: 'list_company_pscs',
  description:
    'List people and entities with significant control for a company using public Companies House register data.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      companyNumber: companyNumberSchema.describe('Companies House company number.'),
      registerView: registerViewSchema,
      ...paginationFields
    })
  )
  .output(pscListOutputSchema)
  .handleInvocation(async ctx => {
    let result = await new CompaniesHouseClient(ctx.auth).listCompanyPscs(
      ctx.input.companyNumber,
      {
        itemsPerPage: ctx.input.itemsPerPage,
        startIndex: ctx.input.startIndex,
        registerView: ctx.input.registerView
      }
    );
    return {
      output: result,
      message: `Found **${result.totalResults}** PSC records for company **${result.companyNumber}**.`
    };
  })
  .build();

export let listPscStatements = SlateTool.create(spec, {
  name: 'List PSC Statements',
  key: 'list_psc_statements',
  description: 'List public Companies House significant-control statements for a company.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      companyNumber: companyNumberSchema.describe('Companies House company number.'),
      registerView: registerViewSchema,
      ...paginationFields
    })
  )
  .output(pscStatementListOutputSchema)
  .handleInvocation(async ctx => {
    let result = await new CompaniesHouseClient(ctx.auth).listPscStatements(
      ctx.input.companyNumber,
      {
        itemsPerPage: ctx.input.itemsPerPage,
        startIndex: ctx.input.startIndex,
        registerView: ctx.input.registerView
      }
    );
    return {
      output: result,
      message: `Found **${result.totalResults}** PSC statements for company **${result.companyNumber}**.`
    };
  })
  .build();
