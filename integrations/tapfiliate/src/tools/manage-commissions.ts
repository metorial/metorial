import { SlateTool } from 'slates';
import { z } from 'zod';
import { TapfiliateClient } from '../lib/client';
import { spec } from '../spec';

let commissionSchema = z.object({
  commissionId: z.number().describe('Unique numeric ID of the commission'),
  amount: z.number().optional().describe('Commission amount'),
  conversionSubAmount: z
    .number()
    .optional()
    .describe('Conversion sub-amount used for calculation'),
  commissionType: z.string().optional().describe('Commission type identifier'),
  approved: z.boolean().optional().describe('Whether the commission is approved'),
  affiliate: z.any().optional().describe('Affiliate who earned the commission'),
  conversion: z.any().optional().describe('Conversion this commission belongs to'),
  kind: z.string().optional().describe('Kind of commission (e.g., regular, bonus)'),
  currency: z.string().optional().describe('Currency code'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  payout: z.any().optional().describe('Payout information if paid'),
  comment: z.string().optional().describe('Comment visible to the affiliate')
});

export let listCommissions = SlateTool.create(spec, {
  name: 'List Commissions',
  key: 'list_commissions',
  description: `List commissions with optional filters by program, affiliate, approval status, pending status, and date range. Results are paginated (25 per page).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      programId: z.string().optional().describe('Filter by program ID'),
      affiliateId: z.string().optional().describe('Filter by affiliate ID'),
      approved: z.boolean().optional().describe('Filter by approval status'),
      pending: z.boolean().optional().describe('Filter by pending status'),
      dateFrom: z.string().optional().describe('Filter from date (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('Filter to date (YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      commissions: z.array(commissionSchema).describe('List of commissions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let results = await client.listCommissions(ctx.input);

    let commissions = results.map((r: any) => ({
      commissionId: r.id,
      amount: r.amount,
      conversionSubAmount: r.conversion_sub_amount,
      commissionType: r.commission_type,
      approved: r.approved,
      affiliate: r.affiliate,
      conversion: r.conversion,
      kind: r.kind,
      currency: r.currency,
      createdAt: r.created_at,
      payout: r.payout,
      comment: r.comment
    }));

    return {
      output: { commissions },
      message: `Found **${commissions.length}** commission(s).`
    };
  })
  .build();

export let getCommission = SlateTool.create(spec, {
  name: 'Get Commission',
  key: 'get_commission',
  description: `Retrieve detailed information about a specific commission including its amount, approval status, associated affiliate, and payout details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      commissionId: z.number().describe('Numeric ID of the commission')
    })
  )
  .output(commissionSchema)
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let result = await client.getCommission(ctx.input.commissionId);

    return {
      output: {
        commissionId: result.id,
        amount: result.amount,
        conversionSubAmount: result.conversion_sub_amount,
        commissionType: result.commission_type,
        approved: result.approved,
        affiliate: result.affiliate,
        conversion: result.conversion,
        kind: result.kind,
        currency: result.currency,
        createdAt: result.created_at,
        payout: result.payout,
        comment: result.comment
      },
      message: `Retrieved commission **#${result.id}** — ${result.amount} ${result.currency || ''} (${result.approved ? 'approved' : 'not approved'}).`
    };
  })
  .build();

export let updateCommission = SlateTool.create(spec, {
  name: 'Update Commission',
  key: 'update_commission',
  description: `Update a commission's amount or comment. The comment will be visible to the affiliate.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      commissionId: z.number().describe('Numeric ID of the commission to update'),
      amount: z.number().optional().describe('New commission amount'),
      comment: z.string().optional().describe('Comment visible to the affiliate')
    })
  )
  .output(commissionSchema)
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let result = await client.updateCommission(ctx.input.commissionId, {
      amount: ctx.input.amount,
      comment: ctx.input.comment
    });

    return {
      output: {
        commissionId: result.id,
        amount: result.amount,
        conversionSubAmount: result.conversion_sub_amount,
        commissionType: result.commission_type,
        approved: result.approved,
        affiliate: result.affiliate,
        conversion: result.conversion,
        kind: result.kind,
        currency: result.currency,
        createdAt: result.created_at,
        payout: result.payout,
        comment: result.comment
      },
      message: `Updated commission **#${result.id}**.`
    };
  })
  .build();

export let approveCommission = SlateTool.create(spec, {
  name: 'Approve Commission',
  key: 'approve_commission',
  description: `Approve a pending commission, making it eligible for payout to the affiliate.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      commissionId: z.number().describe('Numeric ID of the commission to approve')
    })
  )
  .output(commissionSchema)
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let result = await client.approveCommission(ctx.input.commissionId);

    return {
      output: {
        commissionId: result.id,
        amount: result.amount,
        conversionSubAmount: result.conversion_sub_amount,
        commissionType: result.commission_type,
        approved: result.approved,
        affiliate: result.affiliate,
        conversion: result.conversion,
        kind: result.kind,
        currency: result.currency,
        createdAt: result.created_at,
        payout: result.payout,
        comment: result.comment
      },
      message: `Approved commission **#${result.id}** (${result.amount} ${result.currency || ''}).`
    };
  })
  .build();

export let disapproveCommission = SlateTool.create(spec, {
  name: 'Disapprove Commission',
  key: 'disapprove_commission',
  description: `Disapprove a commission, typically used when an order is canceled or refunded. The commission will not be paid out.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      commissionId: z.number().describe('Numeric ID of the commission to disapprove')
    })
  )
  .output(commissionSchema)
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let result = await client.disapproveCommission(ctx.input.commissionId);

    return {
      output: {
        commissionId: result.id,
        amount: result.amount,
        conversionSubAmount: result.conversion_sub_amount,
        commissionType: result.commission_type,
        approved: result.approved,
        affiliate: result.affiliate,
        conversion: result.conversion,
        kind: result.kind,
        currency: result.currency,
        createdAt: result.created_at,
        payout: result.payout,
        comment: result.comment
      },
      message: `Disapproved commission **#${result.id}**.`
    };
  })
  .build();
