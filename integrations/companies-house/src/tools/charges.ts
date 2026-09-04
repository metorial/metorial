import { SlateTool } from 'slates';
import { z } from 'zod';
import { CompaniesHouseClient } from '../lib/client';
import {
  chargeDetailOutputSchema,
  chargeIdSchema,
  chargeListOutputSchema,
  companyNumberSchema,
  paginationFields
} from '../lib/schemas';
import { spec } from '../spec';

export let listCompanyCharges = SlateTool.create(spec, {
  name: 'List Company Charges',
  key: 'list_company_charges',
  description:
    'List registered charges for a Companies House company, including status, classifications, secured details, and persons entitled.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      companyNumber: companyNumberSchema.describe('Companies House company number.'),
      ...paginationFields
    })
  )
  .output(chargeListOutputSchema)
  .handleInvocation(async ctx => {
    let result = await new CompaniesHouseClient(ctx.auth).listCompanyCharges(
      ctx.input.companyNumber,
      { itemsPerPage: ctx.input.itemsPerPage, startIndex: ctx.input.startIndex }
    );
    return {
      output: result,
      message: `Found **${result.totalCount ?? result.charges.length}** charges for company **${result.companyNumber}**.`
    };
  })
  .build();

export let getCompanyCharge = SlateTool.create(spec, {
  name: 'Get Company Charge',
  key: 'get_company_charge',
  description:
    'Get one registered charge for a Companies House company, including its transactions and related public-register details.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      companyNumber: companyNumberSchema.describe('Companies House company number.'),
      chargeId: chargeIdSchema.describe('Charge ID returned by list_company_charges.')
    })
  )
  .output(chargeDetailOutputSchema)
  .handleInvocation(async ctx => {
    let charge = await new CompaniesHouseClient(ctx.auth).getCompanyCharge(
      ctx.input.companyNumber,
      ctx.input.chargeId
    );
    return {
      output: { companyNumber: ctx.input.companyNumber, ...charge },
      message: `Retrieved charge **${charge.chargeId}** for company **${ctx.input.companyNumber}**.`
    };
  })
  .build();
