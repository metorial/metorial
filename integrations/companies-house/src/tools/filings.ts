import { SlateTool } from 'slates';
import { z } from 'zod';
import { CompaniesHouseClient } from '../lib/client';
import {
  companyNumberSchema,
  filingHistoryItemOutputSchema,
  filingHistoryOutputSchema,
  paginationFields,
  transactionIdSchema,
  trimmedStringSchema
} from '../lib/schemas';
import { spec } from '../spec';

let categoriesSchema = z
  .array(trimmedStringSchema)
  .min(1)
  .refine(values => new Set(values).size === values.length, {
    message: 'categories must not contain duplicate values.'
  });

export let listFilingHistory = SlateTool.create(spec, {
  name: 'List Filing History',
  key: 'list_filing_history',
  description:
    'List a company’s Companies House filing history, optionally filtered by one or more filing categories.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      companyNumber: companyNumberSchema.describe('Companies House company number.'),
      categories: categoriesSchema
        .optional()
        .describe('One or more filing categories to include, such as accounts or capital.'),
      ...paginationFields
    })
  )
  .output(filingHistoryOutputSchema)
  .handleInvocation(async ctx => {
    let result = await new CompaniesHouseClient(ctx.auth).listFilingHistory(
      ctx.input.companyNumber,
      {
        categories: ctx.input.categories,
        itemsPerPage: ctx.input.itemsPerPage,
        startIndex: ctx.input.startIndex
      }
    );
    return {
      output: result,
      message: `Found **${result.totalCount}** filings for company **${result.companyNumber}**.`
    };
  })
  .build();

export let getFilingHistoryItem = SlateTool.create(spec, {
  name: 'Get Filing History Item',
  key: 'get_filing_history_item',
  description:
    'Get one Companies House filing-history item and its document metadata link when an image is available.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      companyNumber: companyNumberSchema.describe('Companies House company number.'),
      transactionId: transactionIdSchema.describe(
        'Filing transaction ID returned by list_filing_history.'
      )
    })
  )
  .output(filingHistoryItemOutputSchema)
  .handleInvocation(async ctx => {
    let filing = await new CompaniesHouseClient(ctx.auth).getFilingHistoryItem(
      ctx.input.companyNumber,
      ctx.input.transactionId
    );
    return {
      output: { companyNumber: ctx.input.companyNumber, ...filing },
      message: `Retrieved filing **${filing.transactionId}** for company **${ctx.input.companyNumber}**.`
    };
  })
  .build();
