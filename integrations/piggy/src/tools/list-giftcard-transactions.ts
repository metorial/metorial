import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listGiftcardTransactions = SlateTool.create(spec, {
  name: 'List Gift Card Transactions',
  key: 'list_giftcard_transactions',
  description:
    'Retrieve gift card transaction history with gift card, program, shop, date, sorting, and pagination filters. Older transactions may have no UUID and cannot be reversed by UUID.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      giftcardHash: z.string().optional().describe('Gift card hash to filter transactions'),
      giftcardProgramUuid: z
        .string()
        .optional()
        .describe(
          'Gift card program UUID from get_loyalty_program with includeGiftcardPrograms'
        ),
      shopUuid: z.string().optional().describe('Shop UUID from list_shops'),
      perPage: z.number().optional().describe('Number of records per page, up to 100'),
      page: z.number().optional().describe('Page number starting at one'),
      sort: z.string().optional().describe('created_at or -created_at'),
      createdAfter: z
        .string()
        .optional()
        .describe('Exclusive creation-date lower bound in ISO 8601 format'),
      createdBefore: z
        .string()
        .optional()
        .describe('Exclusive creation-date upper bound in ISO 8601 format')
    })
  )
  .output(
    z.object({
      transactions: z
        .array(z.record(z.string(), z.any()))
        .describe('Unmodified provider transactions'),
      totalCount: z.number().optional(),
      currentPage: z.number().optional(),
      lastPage: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).listGiftcardTransactions({
      giftcardHash: ctx.input.giftcardHash,
      giftcardProgramUuid: ctx.input.giftcardProgramUuid,
      shopUuid: ctx.input.shopUuid,
      perPage: ctx.input.perPage,
      page: ctx.input.page,
      sort: ctx.input.sort,
      createdAtGt: ctx.input.createdAfter,
      createdAtLt: ctx.input.createdBefore
    });
    return {
      output: {
        transactions: result.data,
        totalCount: result.meta?.total,
        currentPage: result.meta?.current_page ?? result.meta?.page,
        lastPage: result.meta?.last_page
      },
      message: `Retrieved ${result.data.length} gift card transactions on this page.`
    };
  })
  .build();
