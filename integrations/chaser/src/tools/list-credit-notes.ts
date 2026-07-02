import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { creditNoteOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listCreditNotes = SlateTool.create(spec, {
  name: 'List Credit Notes',
  key: 'list_credit_notes',
  description: `List credit notes in Chaser with optional filtering and pagination. Filter by credit note ID, number, status, currency, customer, amounts, and date.`,
  instructions: ['Filters use operators like "[eq]", "[in]", "[gte]", "[lte]", etc.'],
  constraints: ['Maximum 100 results per page.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().default(0).describe('Page number (starts at 0)'),
      limit: z.number().optional().default(100).describe('Results per page (max 100)'),
      filters: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Filter parameters (e.g. { "status[eq]": "AUTHORISED", "customer_external_id[eq]": "CUST-001" })'
        )
    })
  )
  .output(
    z.object({
      pageNumber: z.number().describe('Current page number'),
      pageSize: z.number().describe('Results per page'),
      totalCount: z.number().describe('Total matching credit notes'),
      creditNotes: z.array(creditNoteOutputSchema).describe('List of credit notes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listCreditNotes({
      page: ctx.input.page,
      limit: ctx.input.limit,
      filters: ctx.input.filters
    });

    let creditNotes = result.data.map((cn: any) => ({
      creditNoteInternalId: cn.id || '',
      creditNoteId: cn.creditNoteId || '',
      creditNoteNumber: cn.creditNoteNumber || '',
      remainingCredit: cn.remainingCredit ?? 0,
      date: cn.date || '',
      status: cn.status || '',
      total: cn.total ?? 0,
      currencyCode: cn.currencyCode || '',
      customerExternalId: cn.customerExternalId || '',
      customerName: cn.customerName ?? null
    }));

    return {
      output: {
        pageNumber: result.pageNumber,
        pageSize: result.pageSize,
        totalCount: result.totalCount,
        creditNotes
      },
      message: `Found **${result.totalCount}** credit notes (showing page ${result.pageNumber}, ${creditNotes.length} results).`
    };
  })
  .build();
