import { SlateTool } from 'slates';
import { z } from 'zod';
import { TavePublicClient } from '../lib/client';
import { spec } from '../spec';

let paymentSchema = z.object({
  paymentId: z.string().describe('ID of the payment'),
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
      brand: z.string().optional().describe('Filter payments by brand name'),
      jobType: z.string().optional().describe('Filter payments by job type'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      payments: z.array(paymentSchema).describe('List of payments'),
      totalCount: z.number().optional().describe('Total number of payments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TavePublicClient(ctx.auth.token);

    ctx.info('Fetching payments from Tave');

    let result = await client.listPayments({
      brand: ctx.input.brand,
      jobType: ctx.input.jobType,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let items = Array.isArray(result) ? result : (result?.data ?? result?.payments ?? []);

    let payments = items.map((p: any) => ({
      paymentId: String(p.id ?? p.payment_id ?? ''),
      jobType: p.job_type ?? undefined,
      brand: p.brand ?? undefined,
      amount: p.amount ?? p.total ?? undefined,
      status: p.status ?? undefined,
      createdAt: p.created_at ?? p.created ?? undefined,
      raw: p
    }));

    let totalCount = result?.total ?? result?.meta?.total ?? payments.length;

    return {
      output: {
        payments,
        totalCount
      },
      message: `Retrieved **${payments.length}** payment(s)${ctx.input.brand ? ` for brand "${ctx.input.brand}"` : ''}${ctx.input.jobType ? ` of type "${ctx.input.jobType}"` : ''}.`
    };
  })
  .build();
