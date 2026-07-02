import { SlateTool } from 'slates';
import { z } from 'zod';
import { GhostAdminClient } from '../lib/client';
import { spec } from '../spec';

let offerOutputSchema = z.object({
  offerId: z.string().describe('Unique offer ID'),
  name: z.string().describe('Offer name (internal)'),
  code: z.string().describe('Offer code for the URL'),
  displayTitle: z.string().nullable().describe('Public display title'),
  displayDescription: z.string().nullable().describe('Public display description'),
  status: z.string().describe('Offer status (active or archived)'),
  type: z.string().describe('Discount type: percent, fixed, or trial'),
  amount: z.number().describe('Discount amount'),
  currency: z.string().nullable().describe('Currency for fixed discounts'),
  duration: z.string().describe('Duration: once, forever, repeating, or trial'),
  durationInMonths: z
    .number()
    .nullable()
    .describe('Duration in months for repeating discounts'),
  tierId: z.string().describe('Associated tier ID'),
  cadence: z.string().describe('Billing cadence: month or year'),
  redemptionCount: z.number().describe('Number of times the offer has been redeemed'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

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
      action: z.enum(['browse', 'create', 'read', 'update']).describe('Operation to perform'),
      offerId: z.string().optional().describe('Offer ID (required for read/update)'),
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
      tierId: z.string().optional().describe('Tier ID the offer applies to'),
      cadence: z.enum(['month', 'year']).optional().describe('Billing cadence for the offer'),
      status: z.enum(['active', 'archived']).optional().describe('Offer status')
    })
  )
  .output(
    z.object({
      offers: z.array(offerOutputSchema).optional().describe('List of offers (for browse)'),
      offer: offerOutputSchema.optional().describe('Single offer (for create/read/update)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GhostAdminClient({
      domain: ctx.config.adminDomain,
      apiKey: ctx.auth.token
    });

    let { action } = ctx.input;

    if (action === 'browse') {
      let result = await client.browseOffers();
      let offers = (result.offers ?? []).map(mapOffer);
      return {
        output: { offers },
        message: `Found **${offers.length}** offers.`
      };
    }

    if (action === 'read') {
      if (!ctx.input.offerId) throw new Error('offerId is required for reading an offer');
      let result = await client.readOffer(ctx.input.offerId);
      let offer = mapOffer(result.offers[0]);
      return {
        output: { offer },
        message: `Retrieved offer **"${offer.name}"** (${offer.status}).`
      };
    }

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
      if (!ctx.input.offerId) throw new Error('offerId is required for updating an offer');
      let result = await client.updateOffer(ctx.input.offerId, data);
      let offer = mapOffer(result.offers[0]);
      return { output: { offer }, message: `Updated offer **"${offer.name}"**.` };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();

let mapOffer = (o: any) => ({
  offerId: o.id,
  name: o.name,
  code: o.code,
  displayTitle: o.display_title ?? null,
  displayDescription: o.display_description ?? null,
  status: o.status,
  type: o.type,
  amount: o.amount,
  currency: o.currency ?? null,
  duration: o.duration,
  durationInMonths: o.duration_in_months ?? null,
  tierId: o.tier?.id ?? o.tier_id ?? '',
  cadence: o.cadence,
  redemptionCount: o.redemption_count ?? 0,
  createdAt: o.created_at,
  updatedAt: o.updated_at
});
