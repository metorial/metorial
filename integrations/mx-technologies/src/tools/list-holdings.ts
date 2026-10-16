import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { MxClient } from '../lib/client';
import { spec } from '../spec';

export let holdingSchema = z.object({
  guid: z.string().optional().describe('MX-assigned unique identifier'),
  userGuid: z.string().optional().describe('GUID of the owning user'),
  accountGuid: z.string().optional().nullable().describe('GUID of the account'),
  memberGuid: z.string().optional().nullable().describe('GUID of the member'),
  costBasis: z.number().optional().nullable().describe('Cost basis of the holding'),
  currentPrice: z.number().optional().nullable().describe('Current price per unit'),
  dailyChange: z.number().optional().nullable().describe('Daily price change'),
  description: z.string().optional().nullable().describe('Holding description'),
  holdingType: z
    .string()
    .optional()
    .nullable()
    .describe('Type of holding (STOCK, BOND, MUTUAL_FUND, etc.)'),
  marketValue: z.number().optional().nullable().describe('Current market value'),
  quantity: z.number().optional().nullable().describe('Number of units held'),
  symbol: z.string().optional().nullable().describe('Ticker symbol'),
  currencyCode: z.string().optional().nullable().describe('Currency code'),
  createdAt: z.string().optional().nullable().describe('Creation timestamp'),
  updatedAt: z.string().optional().nullable().describe('Last update timestamp'),
  raw: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Complete MX holding record, preserving the original quantity value')
});

export let listHoldings = SlateTool.create(spec, {
  name: 'List Holdings',
  key: 'list_holdings',
  description: `List investment holdings for a user. Optionally filter by account or member. Returns holding details including symbol, quantity, market value, and current price.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userGuid: z.string().describe('MX GUID of the user'),
      accountGuid: z.string().optional().describe('Filter by account GUID'),
      memberGuid: z.string().optional().describe('Filter by member GUID'),
      page: z.number().optional().describe('Page number'),
      recordsPerPage: z.number().optional().describe('Records per page (max: 1000)')
    })
  )
  .output(
    z.object({
      holdings: z.array(holdingSchema),
      pagination: z
        .object({
          currentPage: z.number().optional(),
          perPage: z.number().optional(),
          totalEntries: z.number().optional(),
          totalPages: z.number().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });

    if (ctx.input.accountGuid && ctx.input.memberGuid)
      throw createApiServiceError(
        'Provide either accountGuid or memberGuid to filter holdings.'
      );
    let result: any;
    if (ctx.input.accountGuid) {
      result = await client.listHoldingsByAccount(ctx.input.userGuid, ctx.input.accountGuid, {
        page: ctx.input.page,
        recordsPerPage: ctx.input.recordsPerPage
      });
    } else if (ctx.input.memberGuid) {
      result = await client.listHoldingsByMember(ctx.input.userGuid, ctx.input.memberGuid, {
        page: ctx.input.page,
        recordsPerPage: ctx.input.recordsPerPage
      });
    } else {
      result = await client.listHoldings(ctx.input.userGuid, {
        page: ctx.input.page,
        recordsPerPage: ctx.input.recordsPerPage
      });
    }

    let holdings = result.holdings.map(mapHolding);

    return {
      output: {
        holdings,
        pagination: result.pagination
          ? {
              currentPage: result.pagination.current_page,
              perPage: result.pagination.per_page,
              totalEntries: result.pagination.total_entries,
              totalPages: result.pagination.total_pages
            }
          : undefined
      },
      message: `Found **${holdings.length}** holdings.`
    };
  })
  .build();

export let holdingQuantity = (value: unknown): number | null | undefined => {
  if (value === undefined || value === null) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value)))
    return Number(value);
  throw createApiServiceError('MX returned an invalid holding quantity. Retry the request.');
};

export let mapHolding = (h: Record<string, any>) => ({
  guid: h.guid ?? undefined,
  userGuid: h.user_guid ?? undefined,
  accountGuid: h.account_guid,
  memberGuid: h.member_guid,
  costBasis: h.cost_basis,
  currentPrice: h.current_price,
  dailyChange: h.daily_change,
  description: h.description,
  holdingType: h.holding_type,
  marketValue: h.market_value,
  quantity: holdingQuantity(h.quantity),
  symbol: h.symbol,
  currencyCode: h.currency_code,
  createdAt: h.created_at,
  updatedAt: h.updated_at,
  raw: h
});
