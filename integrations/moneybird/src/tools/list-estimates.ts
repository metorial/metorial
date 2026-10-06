import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoneybirdClient } from '../lib/client';
import { administrationIdSchema } from '../lib/schemas';
import { checkedOutput, exactId, nullableId, validateToolInput } from '../lib/validation';
import { spec } from '../spec';

const outputSchema = z.object({
  nextPage: z.number().int().positive().optional(),
  previousPage: z.number().int().positive().optional(),
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
});

export let listEstimates = SlateTool.create(spec, {
  name: 'List Estimates',
  key: 'list_estimates',
  description: `List and filter estimates (quotes/proposals) in Moneybird. Filter by state, period, or contact. Supports pagination. Call list_administrations to choose administrationId when no default is saved.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      administrationId: administrationIdSchema,
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
  .output(outputSchema)
  .handleInvocation(async ctx => {
    validateToolInput('list_estimates', ctx.input);
    return checkedOutput(outputSchema, async () => {
      let client = new MoneybirdClient({
        token: ctx.auth.token,
        administrationId: ctx.input.administrationId ?? ctx.config.administrationId
      });

      let estimates = await client.listEstimates({
        state: ctx.input.state,
        period: ctx.input.period,
        contactId: ctx.input.contactId,
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });

      let mapped = estimates.map((e: any) => ({
        estimateId: exactId(e.id),
        estimateNumber: e.estimate_id ?? null,
        reference: e.reference ?? null,
        contactId: nullableId(e.contact_id),
        contactName:
          e.contact?.company_name ||
          `${e.contact?.firstname || ''} ${e.contact?.lastname || ''}`.trim() ||
          null,
        state: e.state,
        estimateDate: e.estimate_date ?? null,
        dueDate: e.due_date ?? null,
        currency: e.currency ?? null,
        totalPriceInclTax: e.total_price_incl_tax ?? null
      }));

      return {
        output: {
          estimates: mapped,
          ...client.pagination
        },
        message: `Found ${mapped.length} estimate(s)${ctx.input.state ? ` with state "${ctx.input.state}"` : ''}.`
      };
    });
  })
  .build();
