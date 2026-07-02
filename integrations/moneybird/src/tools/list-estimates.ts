import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoneybirdClient } from '../lib/client';
import { spec } from '../spec';

export let listEstimates = SlateTool.create(spec, {
  name: 'List Estimates',
  key: 'list_estimates',
  description: `List and filter estimates (quotes/proposals) in Moneybird. Filter by state, period, or contact. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      state: z
        .enum(['all', 'draft', 'open', 'late', 'accepted', 'rejected', 'billed', 'archived'])
        .optional()
        .describe('Filter by estimate state'),
      period: z
        .string()
        .optional()
        .describe(
          'Filter by period: "this_month", "prev_month", "this_year", "prev_year", or custom "YYYYMMDD..YYYYMMDD"'
        ),
      contactId: z.string().optional().describe('Filter by contact ID'),
      page: z.number().optional().describe('Page number (starts at 1)'),
      perPage: z.number().optional().describe('Results per page (1-100)')
    })
  )
  .output(
    z.object({
      estimates: z.array(
        z.object({
          estimateId: z.string(),
          estimateNumber: z.string().nullable(),
          reference: z.string().nullable(),
          contactId: z.string().nullable(),
          contactName: z.string().nullable(),
          state: z.string(),
          estimateDate: z.string().nullable(),
          dueDate: z.string().nullable(),
          currency: z.string().nullable(),
          totalPriceInclTax: z.string().nullable()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoneybirdClient({
      token: ctx.auth.token,
      administrationId: ctx.config.administrationId
    });

    let estimates = await client.listEstimates({
      state: ctx.input.state,
      period: ctx.input.period,
      contactId: ctx.input.contactId,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let mapped = estimates.map((e: any) => ({
      estimateId: String(e.id),
      estimateNumber: e.estimate_id || null,
      reference: e.reference || null,
      contactId: e.contact_id ? String(e.contact_id) : null,
      contactName:
        e.contact?.company_name ||
        `${e.contact?.firstname || ''} ${e.contact?.lastname || ''}`.trim() ||
        null,
      state: e.state || 'unknown',
      estimateDate: e.estimate_date || null,
      dueDate: e.due_date || null,
      currency: e.currency || null,
      totalPriceInclTax: e.total_price_incl_tax || null
    }));

    return {
      output: { estimates: mapped },
      message: `Found ${mapped.length} estimate(s)${ctx.input.state ? ` with state "${ctx.input.state}"` : ''}.`
    };
  });
