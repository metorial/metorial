import { SlateTool } from 'slates';
import { z } from 'zod';
import { numberField, TavePublicClient, textField } from '../lib/client';
import { spec } from '../spec';

let paymentSchema = z.object({
  paymentId: z.string().describe('ID of the payment'),
  jobId: z.string().optional().describe('ID of the job associated with the payment'),
  jobType: z.string().optional().describe('Type of job associated with the payment'),
  brand: z.string().optional().describe('Brand associated with the payment'),
  amount: z.number().optional().describe('Payment amount'),
  status: z.string().optional().describe('Status of the payment'),
  createdAt: z.string().optional().describe('When the payment was created'),
  raw: z.any().optional().describe('Full payment record')
});

export let getPayments = SlateTool.create(spec, {
  name: 'Get Payments',
  key: 'get_payments',
  description: `Retrieves payments from Tave. Can filter by brand and job type to narrow results. Requires the **API Key (Public API V2)** authentication method.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      brand: z
        .string()
        .optional()
        .describe('Filter payments by exact brand name or ID from get_brands'),
      jobType: z
        .string()
        .optional()
        .describe('Filter payments by exact job type name or ID from get_job_types'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z
        .number()
        .optional()
        .describe(
          'Results per page: 10–100 for an unfiltered list, or 1–100 for filtered results'
        )
    })
  )
  .output(
    z.object({
      payments: z.array(paymentSchema).describe('List of payments'),
      totalCount: z.number().optional().describe('Total number of payments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TavePublicClient(ctx.auth);

    ctx.info('Fetching payments from Tave');

    let result = await client.listPayments({
      brand: ctx.input.brand,
      jobType: ctx.input.jobType,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let payments = result.items.map(p => ({
      paymentId: String(p.id ?? ''),
      jobId: textField(p, 'jobId'),
      jobType: textField(p, 'jobTypeName', 'job_type'),
      brand: textField(p, 'brandName', 'brand'),
      amount: numberField(p, 'amount', 'total'),
      status: textField(p, 'status'),
      createdAt: textField(p, 'created', 'created_at'),
      raw: p
    }));

    let totalCount = result.meta.totalItems;

    return {
      output: {
        payments,
        totalCount
      },
      message: `Retrieved **${payments.length}** payment(s)${ctx.input.brand ? ` for brand "${ctx.input.brand}"` : ''}${ctx.input.jobType ? ` of type "${ctx.input.jobType}"` : ''}.`
    };
  })
  .build();
