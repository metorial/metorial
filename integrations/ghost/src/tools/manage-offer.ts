import { SlateTool } from 'slates';
import { z } from 'zod';
import { getClient } from '../lib/client';
import { invalid, pagination, paginationSchema, resourceId } from '../lib/schemas';
import { spec } from '../spec';

let offerOutputSchema = z
  .object({
    offerId: z.string().describe('Unique offer ID'),
    name: z.string().optional().describe('Offer name (internal)'),
    code: z.string().optional().describe('Offer code for the URL'),
    displayTitle: z.string().nullable().optional().describe('Public display title'),
    displayDescription: z
      .string()
      .nullable()
      .optional()
      .describe('Public display description'),
    status: z.string().optional().describe('Offer status (active or archived)'),
    type: z.string().optional().describe('Discount type: percent, fixed, or trial'),
    amount: z.number().optional().describe('Discount amount'),
    currency: z.string().nullable().optional().describe('Currency for fixed discounts'),
    duration: z.string().optional().describe('Duration: once, forever, repeating, or trial'),
    durationInMonths: z
      .number()
      .nullable()
      .describe('Duration in months for repeating discounts'),
    tierId: z.string().describe('Associated tier ID'),
    cadence: z.string().optional().describe('Billing cadence: month or year'),
    redemptionCount: z
      .number()
      .optional()
      .describe('Number of times the offer has been redeemed'),
    createdAt: z.string().optional().describe('Creation timestamp'),
    updatedAt: z.string().optional().describe('Last update timestamp')
  })
  .partial()
  .required({ offerId: true });

export let manageOffer = SlateTool.create(spec, {
  name: 'Manage Offer',
  key: 'manage_offer',
  description: `Create, read, update, or browse promotional offers. Offers provide discounts or free trials for specific membership tiers, generating unique signup URLs.`,
  instructions: [
    'For **browsing**: set `action` to `"browse"` to list all offers.',
    'For **creating**: set `action` to `"create"` and provide `name`, `code`, `tierId`, `cadence`, `type`, `amount`, and `duration`.',
    'For **reading**: set `action` to `"read"` and provide `offerId`.',
    'For **updating**: set `action` to `"update"`, provide `offerId` plus fields to change.',
    'Discount types: `percent` (0-100), `fixed` (amount in cents), `trial` (free trial days).'
  ]
})
  .input(
    z.object({
      filter: z.string().optional().describe('Native NQL filter for browsing offers'),
      limit: z.number().optional().describe('Records per page; legacy0 requests all records'),
      page: z.number().optional().describe('Native positive page number'),
      action: z.enum(['browse', 'create', 'read', 'update']).describe('Operation to perform'),
      offerId: resourceId.optional().describe('Offer ID (required for read/update)'),
      name: z.string().optional().describe('Internal offer name'),
      code: z.string().optional().describe('URL-friendly offer code'),
      displayTitle: z.string().optional().describe('Public display title'),
      displayDescription: z.string().optional().describe('Public display description'),
      type: z.enum(['percent', 'fixed', 'trial']).optional().describe('Discount type'),
      amount: z
        .number()
        .optional()
        .describe('Discount amount (percent 0-100, fixed in cents, trial in days)'),
      currency: z.string().optional().describe('Currency for fixed discounts (e.g., "usd")'),
      duration: z
        .enum(['once', 'forever', 'repeating', 'trial'])
        .optional()
        .describe('How long the discount lasts'),
      durationInMonths: z
        .number()
        .optional()
        .describe('Duration in months for repeating discounts'),
      tierId: resourceId.optional().describe('Tier ID the offer applies to'),
      cadence: z.enum(['month', 'year']).optional().describe('Billing cadence for the offer'),
      status: z.enum(['active', 'archived']).optional().describe('Offer status')
    })
  )
  .output(
    z.object({
      pagination: paginationSchema.optional().describe('Native offer browse pagination'),
      offers: z.array(offerOutputSchema).optional().describe('List of offers (for browse)'),
      offer: offerOutputSchema.optional().describe('Single offer (for create/read/update)')
    })
  )
  .handleInvocation(async ctx => {
    let client = getClient(ctx);

    let { action } = ctx.input;

    if (action === 'browse') {
      let result = await client.browseOffers({
        filter: ctx.input.filter,
        limit: ctx.input.limit,
        page: ctx.input.page
      });
      let offers = (result.offers ?? []).map(mapOffer);
      return {
        output: { offers, pagination: pagination(result, offers.length) },
        message: `Found **${offers.length}** offers.`
      };
    }

    if (action === 'read') {
      if (!ctx.input.offerId) throw invalid('offerId is required for reading an offer');
      let result = await client.readOffer(ctx.input.offerId);
      let offer = mapOffer(result.offers[0]);
      return {
        output: { offer },
        message: `Retrieved offer **"${offer.name}"** (${offer.status}).`
      };
    }

    if (action === 'create') {
      for (const name of [
        'name',
        'code',
        'tierId',
        'cadence',
        'type',
        'amount',
        'duration'
      ] as const)
        if (ctx.input[name] === undefined || ctx.input[name] === '')
          throw invalid(`${name} is required for creating an offer.`);
      if (ctx.input.type === 'fixed' && !ctx.input.currency)
        throw invalid('Fixed discounts require currency matching the tier.');
    }
    if (
      ctx.input.amount !== undefined &&
      (!Number.isSafeInteger(ctx.input.amount) ||
        ctx.input.amount < 0 ||
        (ctx.input.type === 'percent' && ctx.input.amount > 100))
    )
      throw invalid(
        'amount must be an exact nonnegative integer in native percent, minor currency units, or trial days.'
      );
    if (
      ctx.input.durationInMonths !== undefined &&
      (!Number.isSafeInteger(ctx.input.durationInMonths) || ctx.input.durationInMonths < 1)
    )
      throw invalid('durationInMonths must be a positive integer.');
    let data: Record<string, any> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.code !== undefined) data.code = ctx.input.code;
    if (ctx.input.displayTitle !== undefined) data.display_title = ctx.input.displayTitle;
    if (ctx.input.displayDescription !== undefined)
      data.display_description = ctx.input.displayDescription;
    if (ctx.input.type !== undefined) data.type = ctx.input.type;
    if (ctx.input.amount !== undefined) data.amount = ctx.input.amount;
    if (ctx.input.currency !== undefined) data.currency = ctx.input.currency;
    if (ctx.input.duration !== undefined) data.duration = ctx.input.duration;
    if (ctx.input.durationInMonths !== undefined)
      data.duration_in_months = ctx.input.durationInMonths;
    if (ctx.input.tierId !== undefined) data.tier = { id: ctx.input.tierId };
    if (ctx.input.cadence !== undefined) data.cadence = ctx.input.cadence;
    if (ctx.input.status !== undefined) data.status = ctx.input.status;

    if (action === 'create') {
      let result = await client.createOffer(data);
      let offer = mapOffer(result.offers[0]);
      return {
        output: { offer },
        message: `Created offer **"${offer.name}"** with code \`${offer.code}\`.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.offerId) throw invalid('offerId is required for updating an offer');
      let result = await client.updateOffer(ctx.input.offerId, data);
      let offer = mapOffer(result.offers[0]);
      return { output: { offer }, message: `Updated offer **"${offer.name}"**.` };
    }

    throw invalid(`Unknown action: ${action}`);
  })
  .build();

let mapOffer = (o: any) => ({
  offerId: o.id,
  name: o.name,
  code: o.code,
  displayTitle: o.display_title,
  displayDescription: o.display_description,
  status: o.status,
  type: o.type,
  amount: o.amount,
  currency: o.currency,
  duration: o.duration,
  durationInMonths: o.duration_in_months,
  tierId: o.tier?.id ?? o.tier_id,
  cadence: o.cadence,
  redemptionCount: o.redemption_count,
  createdAt: o.created_at,
  updatedAt: o.updated_at
});
