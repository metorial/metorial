import { SlateTool } from 'slates';
import { z } from 'zod';
import { TapfiliateClient } from '../lib/client';
import { spec } from '../spec';

let conversionSchema = z.object({
  conversionId: z.number().describe('Unique numeric ID of the conversion'),
  externalId: z.string().optional().describe('External reference ID (e.g., order number)'),
  amount: z.number().optional().describe('Conversion amount'),
  currency: z.string().optional().describe('Currency code'),
  click: z.any().optional().describe('Click data associated with the conversion'),
  commissions: z
    .array(z.any())
    .optional()
    .describe('Commissions generated from this conversion'),
  affiliate: z.any().optional().describe('Affiliate who referred the conversion'),
  program: z.any().optional().describe('Program the conversion belongs to'),
  customer: z.any().optional().describe('Customer associated with the conversion'),
  metaData: z.record(z.string(), z.any()).optional().describe('Custom metadata'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

export let createConversion = SlateTool.create(spec, {
  name: 'Create Conversion',
  key: 'create_conversion',
  description: `Create a new conversion (sale/transaction) in Tapfiliate. Attribute the conversion via referral code, coupon code, click ID, customer ID, tracking ID, or asset/source ID. Supports setting amounts, currencies, external IDs, and metadata.`,
  instructions: [
    'At least one attribution method must be provided: referralCode, coupon, clickId, customerId, trackingId, or assetId+sourceId.',
    'The externalId should be a unique identifier from your system (e.g., order number).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      referralCode: z.string().optional().describe('Affiliate referral code for attribution'),
      trackingId: z.string().optional().describe('Tracking ID for attribution'),
      clickId: z.string().optional().describe('Click ID for attribution'),
      coupon: z.string().optional().describe('Coupon code for attribution'),
      customerId: z
        .string()
        .optional()
        .describe('Customer ID for recurring/lifetime attribution'),
      externalId: z
        .string()
        .optional()
        .describe('Unique external reference (e.g., order number)'),
      amount: z.number().optional().describe('Conversion amount for commission calculation'),
      currency: z.string().optional().describe('Currency code (e.g., USD, EUR)'),
      commissionType: z.string().optional().describe('Commission type identifier'),
      commissions: z
        .array(
          z.object({
            subAmount: z.number().optional().describe('Sub-amount for this commission'),
            commissionType: z
              .string()
              .optional()
              .describe('Commission type for this specific commission'),
            comment: z.string().optional().describe('Comment visible to the affiliate')
          })
        )
        .optional()
        .describe('Explicit commission entries'),
      programGroup: z.string().optional().describe('Program group for attribution'),
      assetId: z.string().optional().describe('Asset ID for asset/source attribution'),
      sourceId: z.string().optional().describe('Source ID for asset/source attribution'),
      userAgent: z
        .string()
        .optional()
        .describe('User agent string (for REST-only integrations)'),
      ip: z.string().optional().describe('IP address (for REST-only integrations)'),
      metaData: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom key-value metadata'),
      overrideMaxCookieTime: z
        .boolean()
        .optional()
        .describe('Override max cookie time for attribution')
    })
  )
  .output(conversionSchema)
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let result = await client.createConversion(ctx.input);

    return {
      output: {
        conversionId: result.id,
        externalId: result.external_id,
        amount: result.amount,
        currency: result.currency,
        click: result.click,
        commissions: result.commissions,
        affiliate: result.affiliate,
        program: result.program,
        customer: result.customer,
        metaData: result.meta_data,
        createdAt: result.created_at
      },
      message: `Created conversion **#${result.id}**${result.amount ? ` for ${result.amount} ${result.currency || ''}` : ''}.`
    };
  })
  .build();

export let getConversion = SlateTool.create(spec, {
  name: 'Get Conversion',
  key: 'get_conversion',
  description: `Retrieve detailed information about a specific conversion, including its commissions, affiliate, program, and metadata.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      conversionId: z.number().describe('Numeric ID of the conversion')
    })
  )
  .output(conversionSchema)
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let result = await client.getConversion(ctx.input.conversionId);

    return {
      output: {
        conversionId: result.id,
        externalId: result.external_id,
        amount: result.amount,
        currency: result.currency,
        click: result.click,
        commissions: result.commissions,
        affiliate: result.affiliate,
        program: result.program,
        customer: result.customer,
        metaData: result.meta_data,
        createdAt: result.created_at
      },
      message: `Retrieved conversion **#${result.id}**${result.amount ? ` (${result.amount} ${result.currency || ''})` : ''}.`
    };
  })
  .build();

export let listConversions = SlateTool.create(spec, {
  name: 'List Conversions',
  key: 'list_conversions',
  description: `List conversions with optional filters by program, affiliate, external ID, pending status, and date range. Results are paginated (25 per page).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      programId: z.string().optional().describe('Filter by program ID'),
      externalId: z.string().optional().describe('Filter by external ID'),
      affiliateId: z.string().optional().describe('Filter by affiliate ID'),
      pending: z.boolean().optional().describe('Filter by pending status'),
      dateFrom: z.string().optional().describe('Filter from date (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('Filter to date (YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      conversions: z.array(conversionSchema).describe('List of conversions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let results = await client.listConversions(ctx.input);

    let conversions = results.map((r: any) => ({
      conversionId: r.id,
      externalId: r.external_id,
      amount: r.amount,
      currency: r.currency,
      click: r.click,
      commissions: r.commissions,
      affiliate: r.affiliate,
      program: r.program,
      customer: r.customer,
      metaData: r.meta_data,
      createdAt: r.created_at
    }));

    return {
      output: { conversions },
      message: `Found **${conversions.length}** conversion(s).`
    };
  })
  .build();

export let updateConversion = SlateTool.create(spec, {
  name: 'Update Conversion',
  key: 'update_conversion',
  description: `Update an existing conversion's amount, external ID, or metadata. Commissions can be optionally recalculated when the amount changes (e.g., for partial refunds).`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      conversionId: z.number().describe('Numeric ID of the conversion to update'),
      amount: z.number().optional().describe('New conversion amount'),
      externalId: z.string().optional().describe('New external reference ID'),
      metaData: z
        .record(z.string(), z.string())
        .optional()
        .describe('Updated metadata (replaces existing)'),
      recalculateCommissions: z
        .boolean()
        .optional()
        .describe('Whether to recalculate commissions based on the new amount (default: true)')
    })
  )
  .output(conversionSchema)
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let result = await client.updateConversion(ctx.input.conversionId, ctx.input);

    return {
      output: {
        conversionId: result.id,
        externalId: result.external_id,
        amount: result.amount,
        currency: result.currency,
        click: result.click,
        commissions: result.commissions,
        affiliate: result.affiliate,
        program: result.program,
        customer: result.customer,
        metaData: result.meta_data,
        createdAt: result.created_at
      },
      message: `Updated conversion **#${result.id}**.`
    };
  })
  .build();

export let deleteConversion = SlateTool.create(spec, {
  name: 'Delete Conversion',
  key: 'delete_conversion',
  description: `Permanently delete a conversion and its associated commissions. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      conversionId: z.number().describe('Numeric ID of the conversion to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    await client.deleteConversion(ctx.input.conversionId);

    return {
      output: { deleted: true },
      message: `Deleted conversion **#${ctx.input.conversionId}**.`
    };
  })
  .build();

export let addCommissionToConversion = SlateTool.create(spec, {
  name: 'Add Commission to Conversion',
  key: 'add_commission_to_conversion',
  description: `Add additional commission(s) to an existing conversion. Useful for recurring subscription payments where each payment generates a new commission on the original conversion.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      conversionId: z.number().describe('Numeric ID of the conversion'),
      conversionSubAmount: z
        .number()
        .describe('Amount on which the commission should be calculated'),
      commissionType: z
        .string()
        .optional()
        .describe('Commission type identifier (uses program default if not specified)'),
      comment: z.string().optional().describe('Comment visible to the affiliate')
    })
  )
  .output(
    z.object({
      commissions: z.array(z.any()).describe('Newly created commission(s)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let result = await client.addCommissionsToConversion(ctx.input.conversionId, {
      conversionSubAmount: ctx.input.conversionSubAmount,
      commissionType: ctx.input.commissionType,
      comment: ctx.input.comment
    });

    return {
      output: { commissions: result },
      message: `Added commission(s) to conversion **#${ctx.input.conversionId}** for sub-amount ${ctx.input.conversionSubAmount}.`
    };
  })
  .build();
