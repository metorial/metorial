import { SlateTool } from 'slates';
import { z } from 'zod';
import { AdvancedTradeClient } from '../lib/advanced-trade-client';
import { coinbaseOAuthAuthMethods } from '../lib/auth-methods';
import { coinbaseServiceError } from '../lib/errors';
import { spec } from '../spec';

let portfolioSchema = z.object({
  portfolioUuid: z.string().describe('Portfolio UUID'),
  name: z.string().optional().describe('Portfolio name'),
  portfolioType: z.string().optional().describe('Portfolio type'),
  deleted: z.boolean().optional().describe('Whether the portfolio is deleted')
});

let balanceSchema = z.object({
  value: z.string().optional().describe('Balance value'),
  currency: z.string().optional().describe('Balance currency')
});

let spotPositionSchema = z.object({
  asset: z.string().optional().describe('Asset symbol'),
  accountUuid: z.string().optional().describe('Account UUID'),
  totalBalanceFiat: z.number().optional().describe('Total balance in fiat'),
  totalBalanceCrypto: z.number().optional().describe('Total balance in crypto'),
  availableToTradeFiat: z.number().optional().describe('Available fiat to trade'),
  availableToTradeCrypto: z.number().optional().describe('Available crypto to trade'),
  availableToTransferFiat: z.number().optional().describe('Available fiat to transfer'),
  availableToTransferCrypto: z.number().optional().describe('Available crypto to transfer'),
  allocation: z.number().optional().describe('Portfolio allocation'),
  costBasis: balanceSchema.optional().describe('Cost basis'),
  averageEntryPrice: balanceSchema.optional().describe('Average entry price'),
  unrealizedPnl: z.number().optional().describe('Unrealized profit and loss'),
  accountType: z.string().optional().describe('Account type')
});

let mapPortfolio = (portfolio: any): z.infer<typeof portfolioSchema> => ({
  portfolioUuid: portfolio.uuid,
  name: portfolio.name,
  portfolioType: portfolio.type,
  deleted: portfolio.deleted
});

let mapBalance = (value: any): z.infer<typeof balanceSchema> | undefined =>
  value ? { value: value.value, currency: value.currency } : undefined;

let mapSpotPosition = (position: any): z.infer<typeof spotPositionSchema> => ({
  asset: position.asset,
  accountUuid: position.account_uuid,
  totalBalanceFiat: position.total_balance_fiat,
  totalBalanceCrypto: position.total_balance_crypto,
  availableToTradeFiat: position.available_to_trade_fiat,
  availableToTradeCrypto: position.available_to_trade_crypto,
  availableToTransferFiat: position.available_to_transfer_fiat,
  availableToTransferCrypto: position.available_to_transfer_crypto,
  allocation: position.allocation,
  costBasis: mapBalance(position.cost_basis),
  averageEntryPrice: mapBalance(position.average_entry_price),
  unrealizedPnl: position.unrealized_pnl,
  accountType: position.account_type
});

export let managePortfolios = SlateTool.create(spec, {
  name: 'Manage Portfolios',
  key: 'manage_portfolios',
  description:
    'List Coinbase Advanced Trade portfolios or retrieve a portfolio breakdown with balances and spot positions.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .authMethods(coinbaseOAuthAuthMethods)
  .input(
    z.object({
      action: z.enum(['list', 'get_breakdown']).describe('Operation to perform'),
      portfolioUuid: z
        .string()
        .optional()
        .describe('Portfolio UUID (required for get_breakdown)'),
      portfolioType: z
        .enum(['UNDEFINED', 'DEFAULT', 'CONSUMER', 'INTX'])
        .optional()
        .describe('Optional portfolio type filter for list')
    })
  )
  .output(
    z.object({
      portfolios: z.array(portfolioSchema).optional().describe('List of portfolios'),
      portfolio: portfolioSchema.optional().describe('Portfolio details'),
      portfolioBalances: z
        .object({
          totalBalance: balanceSchema.optional(),
          totalFuturesBalance: balanceSchema.optional(),
          totalCashEquivalentBalance: balanceSchema.optional(),
          totalCryptoBalance: balanceSchema.optional(),
          futuresUnrealizedPnl: balanceSchema.optional(),
          perpUnrealizedPnl: balanceSchema.optional()
        })
        .optional()
        .describe('Portfolio balance totals'),
      spotPositions: z
        .array(spotPositionSchema)
        .optional()
        .describe('Spot positions in the portfolio')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AdvancedTradeClient({ token: ctx.auth.token });

    if (ctx.input.action === 'get_breakdown') {
      if (!ctx.input.portfolioUuid) {
        throw coinbaseServiceError('portfolioUuid is required for get_breakdown');
      }

      let result = await client.getPortfolioBreakdown(ctx.input.portfolioUuid);
      let breakdown = result.breakdown || {};
      let balances = breakdown.portfolio_balances || {};

      return {
        output: {
          portfolio: breakdown.portfolio ? mapPortfolio(breakdown.portfolio) : undefined,
          portfolioBalances: {
            totalBalance: mapBalance(balances.total_balance),
            totalFuturesBalance: mapBalance(balances.total_futures_balance),
            totalCashEquivalentBalance: mapBalance(balances.total_cash_equivalent_balance),
            totalCryptoBalance: mapBalance(balances.total_crypto_balance),
            futuresUnrealizedPnl: mapBalance(balances.futures_unrealized_pnl),
            perpUnrealizedPnl: mapBalance(balances.perp_unrealized_pnl)
          },
          spotPositions: (breakdown.spot_positions || []).map(mapSpotPosition)
        },
        message: `Retrieved portfolio breakdown for **${ctx.input.portfolioUuid}**`
      };
    }

    let result = await client.listPortfolios({ portfolioType: ctx.input.portfolioType });
    let portfolios = result.portfolios || [];
    return {
      output: {
        portfolios: portfolios.map(mapPortfolio)
      },
      message: `Found **${portfolios.length}** portfolio(s)`
    };
  })
  .build();
