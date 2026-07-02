import { SlateTool } from 'slates';
import { z } from 'zod';
import { CommerceClient } from '../lib/commerce-client';
import { spec } from '../spec';

let chargeSchema = z.object({
  chargeId: z.string().describe('Charge ID'),
  chargeCode: z.string().optional().describe('Charge code'),
  name: z.string().optional().describe('Charge name'),
  description: z.string().optional().nullable().describe('Charge description'),
  pricingType: z.string().optional().describe('fixed_price or no_price'),
  localPrice: z
    .object({
      amount: z.string(),
      currency: z.string()
    })
    .optional()
    .describe('Requested price'),
  hostedUrl: z.string().optional().describe('URL for the hosted payment page'),
  status: z
    .string()
    .optional()
    .describe('Current charge status (NEW, PENDING, COMPLETED, EXPIRED, etc.)'),
  confirmedAt: z.string().optional().nullable().describe('Confirmation timestamp'),
  expiresAt: z.string().optional().nullable().describe('Expiration timestamp'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

export let manageCommerceCharges = SlateTool.create(spec, {
  name: 'Manage Commerce Charges',
  key: 'manage_commerce_charges',
  description: `Create, list, get, cancel, or resolve Coinbase Commerce charges for accepting crypto payments. A charge represents a payment request that customers can pay with cryptocurrency.`,
  instructions: [
    'For fixed_price charges, localPrice (amount + currency) is required.',
    'For no_price (donation) charges, localPrice is not needed.',
    'Use the hostedUrl in the response to redirect customers to the payment page.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'list', 'get', 'cancel', 'resolve'])
        .describe('Operation to perform'),
      chargeCodeOrId: z
        .string()
        .optional()
        .describe('Charge code or ID (required for get, cancel, resolve)'),
      name: z.string().optional().describe('Name/title for the charge (required for create)'),
      description: z
        .string()
        .optional()
        .describe('Description of the charge (required for create)'),
      pricingType: z
        .enum(['fixed_price', 'no_price'])
        .optional()
        .describe('Pricing type (required for create)'),
      amount: z.string().optional().describe('Price amount (required for fixed_price)'),
      currency: z
        .string()
        .optional()
        .describe('Price currency, e.g., "USD" (required for fixed_price)'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom metadata key-value pairs'),
      redirectUrl: z.string().optional().describe('URL to redirect after successful payment'),
      cancelUrl: z.string().optional().describe('URL to redirect if customer cancels'),
      limit: z.number().optional().describe('Max results to return (for list)'),
      startingAfter: z.string().optional().describe('Cursor for pagination (for list)')
    })
  )
  .output(
    z.object({
      charge: chargeSchema.optional().describe('Single charge details'),
      charges: z.array(chargeSchema).optional().describe('List of charges'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CommerceClient({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for create');
      if (!ctx.input.description) throw new Error('description is required for create');
      if (!ctx.input.pricingType) throw new Error('pricingType is required for create');

      let localPrice =
        ctx.input.pricingType === 'fixed_price' && ctx.input.amount && ctx.input.currency
          ? { amount: ctx.input.amount, currency: ctx.input.currency }
          : undefined;

      let charge = await client.createCharge({
        name: ctx.input.name,
        description: ctx.input.description,
        pricingType: ctx.input.pricingType,
        localPrice,
        metadata: ctx.input.metadata,
        redirectUrl: ctx.input.redirectUrl,
        cancelUrl: ctx.input.cancelUrl
      });

      return {
        output: {
          charge: mapCharge(charge)
        },
        message: `Created charge **${charge.code}** — ${charge.pricing_type === 'fixed_price' ? `${ctx.input.amount} ${ctx.input.currency}` : 'donation'} — [Payment page](${charge.hosted_url})`
      };
    }

    if (action === 'get') {
      if (!ctx.input.chargeCodeOrId) throw new Error('chargeCodeOrId is required for get');
      let charge = await client.getCharge(ctx.input.chargeCodeOrId);
      return {
        output: { charge: mapCharge(charge) },
        message: `Charge **${charge.code}** — Status: ${extractStatus(charge)}`
      };
    }

    if (action === 'cancel') {
      if (!ctx.input.chargeCodeOrId) throw new Error('chargeCodeOrId is required for cancel');
      let charge = await client.cancelCharge(ctx.input.chargeCodeOrId);
      return {
        output: { charge: mapCharge(charge) },
        message: `Cancelled charge **${charge.code}**`
      };
    }

    if (action === 'resolve') {
      if (!ctx.input.chargeCodeOrId) throw new Error('chargeCodeOrId is required for resolve');
      let charge = await client.resolveCharge(ctx.input.chargeCodeOrId);
      return {
        output: { charge: mapCharge(charge) },
        message: `Resolved charge **${charge.code}**`
      };
    }

    // list
    let result = await client.listCharges({
      limit: ctx.input.limit,
      startingAfter: ctx.input.startingAfter
    });
    let charges = result.data || [];
    return {
      output: {
        charges: charges.map(mapCharge),
        hasMore: !!result.pagination?.next_uri
      },
      message: `Found **${charges.length}** charge(s)`
    };
  })
  .build();

let mapCharge = (c: any) => ({
  chargeId: c.id,
  chargeCode: c.code,
  name: c.name,
  description: c.description || null,
  pricingType: c.pricing_type,
  localPrice: c.local_price
    ? { amount: c.local_price.amount, currency: c.local_price.currency }
    : undefined,
  hostedUrl: c.hosted_url,
  status: extractStatus(c),
  confirmedAt: c.confirmed_at || null,
  expiresAt: c.expires_at || null,
  createdAt: c.created_at
});

let extractStatus = (c: any): string => {
  if (c.timeline && c.timeline.length > 0) {
    return c.timeline[c.timeline.length - 1].status;
  }
  return c.status || 'UNKNOWN';
};
