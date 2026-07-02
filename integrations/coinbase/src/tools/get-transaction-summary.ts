import { SlateTool } from 'slates';
import { z } from 'zod';
import { AdvancedTradeClient } from '../lib/advanced-trade-client';
import { coinbaseOAuthAuthMethods } from '../lib/auth-methods';
import { spec } from '../spec';

export let getTransactionSummary = SlateTool.create(spec, {
  name: 'Get Transaction Summary',
  key: 'get_transaction_summary',
  description:
    'Get an Advanced Trade transaction summary, including fee tier, volume, fees, and total balance.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .authMethods(coinbaseOAuthAuthMethods)
  .input(
    z.object({
      productType: z
        .enum(['UNKNOWN_PRODUCT_TYPE', 'SPOT', 'FUTURE'])
        .optional()
        .describe('Product type filter'),
      contractExpiryType: z
        .enum(['UNKNOWN_CONTRACT_EXPIRY_TYPE', 'EXPIRING', 'PERPETUAL'])
        .optional()
        .describe('Contract expiry filter for futures'),
      productVenue: z
        .enum(['UNKNOWN_VENUE_TYPE', 'CBE', 'FCM', 'INTX'])
        .optional()
        .describe('Product venue filter')
    })
  )
  .output(
    z.object({
      totalFees: z.number().optional().describe('Total fees across assets in USD'),
      totalBalance: z.string().optional().describe('Total balance'),
      advancedTradeOnlyVolume: z.number().optional().describe('Advanced Trade-only volume'),
      advancedTradeOnlyFees: z.number().optional().describe('Advanced Trade-only fees'),
      coinbaseProVolume: z.number().optional().describe('Coinbase Pro volume'),
      coinbaseProFees: z.number().optional().describe('Coinbase Pro fees'),
      hasCostPlusCommission: z.boolean().optional().describe('Cost-plus commission flag'),
      feeTier: z
        .object({
          pricingTier: z.string().optional(),
          takerFeeRate: z.string().optional(),
          makerFeeRate: z.string().optional(),
          aopFrom: z.string().optional(),
          aopTo: z.string().optional()
        })
        .optional()
        .describe('Current fee tier'),
      volumeBreakdown: z
        .array(
          z.object({
            volumeType: z.string().optional(),
            volume: z.number().optional()
          })
        )
        .optional()
        .describe('Volume by product type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AdvancedTradeClient({ token: ctx.auth.token });
    let summary = await client.getTransactionSummary(ctx.input);

    return {
      output: {
        totalFees: summary.total_fees,
        totalBalance: summary.total_balance,
        advancedTradeOnlyVolume: summary.advanced_trade_only_volume,
        advancedTradeOnlyFees: summary.advanced_trade_only_fees,
        coinbaseProVolume: summary.coinbase_pro_volume,
        coinbaseProFees: summary.coinbase_pro_fees,
        hasCostPlusCommission: summary.has_cost_plus_commission,
        feeTier: summary.fee_tier
          ? {
              pricingTier: summary.fee_tier.pricing_tier,
              takerFeeRate: summary.fee_tier.taker_fee_rate,
              makerFeeRate: summary.fee_tier.maker_fee_rate,
              aopFrom: summary.fee_tier.aop_from,
              aopTo: summary.fee_tier.aop_to
            }
          : undefined,
        volumeBreakdown: (summary.volume_breakdown || []).map((item: any) => ({
          volumeType: item.volume_type,
          volume: item.volume
        }))
      },
      message: `Retrieved transaction summary${summary.fee_tier?.pricing_tier ? ` for fee tier **${summary.fee_tier.pricing_tier}**` : ''}`
    };
  })
  .build();
