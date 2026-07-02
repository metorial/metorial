import { SlateTool } from 'slates';
import { z } from 'zod';
import { CultsClient } from '../lib/client';
import { spec } from '../spec';

let saleSchema = z.object({
  saleId: z.string().describe('Unique sale ID'),
  createdAt: z.string().nullable().describe('Sale timestamp (ISO-8601)'),
  payedOutAt: z.string().nullable().describe('Payout timestamp (ISO-8601)'),
  incomeValue: z.number().nullable().describe('Income amount in the requested currency'),
  creationIdentifier: z.string().nullable().describe('Identifier of the sold creation'),
  creationName: z.string().nullable().describe('Name of the sold creation'),
  creationUrl: z.string().nullable().describe('URL of the sold creation'),
  buyerNick: z.string().nullable().describe('Username of the buyer'),
  creationViewsCount: z.number().nullable().describe('Views at time of sale'),
  creationLikesCount: z.number().nullable().describe('Likes at time of sale'),
  discountPercentage: z.number().nullable().describe('Discount percentage applied'),
  discountStartAt: z.string().nullable().describe('Discount start date'),
  discountEndAt: z.string().nullable().describe('Discount end date')
});

export let getMySales = SlateTool.create(spec, {
  name: 'Get My Sales',
  key: 'get_my_sales',
  description: `Retrieve your sales history on Cults3D. Returns individual sale records with income, buyer info, creation snapshots (views/likes at sale time), and discount details. Supports pagination and currency selection.`,
  instructions: [
    'Currency must be a valid ISO currency code supported by Cults (e.g. USD, EUR)'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of sales to return (default 20)'),
      offset: z.number().min(0).optional().describe('Number of sales to skip for pagination'),
      currency: z
        .enum(['USD', 'EUR'])
        .optional()
        .describe('Currency for income amounts (default USD)')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of sales'),
      sales: z.array(saleSchema).describe('List of sale records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CultsClient({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let result = await client.getMySales({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      currency: ctx.input.currency
    });

    let sales = result.results.map((s: any) => ({
      saleId: s.id,
      createdAt: s.createdAt,
      payedOutAt: s.payedOutAt,
      incomeValue: s.income?.value ?? null,
      creationIdentifier: s.creation?.identifier ?? null,
      creationName: s.creation?.name ?? null,
      creationUrl: s.creation?.url ?? null,
      buyerNick: s.user?.nick ?? null,
      creationViewsCount: s.creationViewsCount,
      creationLikesCount: s.creationLikesCount,
      discountPercentage: s.discount?.percentage ?? null,
      discountStartAt: s.discount?.startAt ?? null,
      discountEndAt: s.discount?.endAt ?? null
    }));

    return {
      output: {
        total: result.total,
        sales
      },
      message: `Found **${result.total}** total sales. Returned ${sales.length} sale records.`
    };
  })
  .build();
