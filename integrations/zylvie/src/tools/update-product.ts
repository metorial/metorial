import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateProduct = SlateTool.create(spec, {
  name: 'Update Product',
  key: 'update_product',
  description: `Update an existing product in your Zylvie store. Only include the fields you want to change. Note that providing \`categories\`, \`tags\`, \`productImages\`, or \`productFiles\` will **completely replace** the existing values.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      productId: z.string().describe('ID of the product to update'),

      title: z.string().optional().describe('New title for the product'),
      url: z.string().optional().describe('New vanity URL slug'),
      currency: z.string().optional().describe('New lowercase 3-letter ISO currency code'),
      price: z.number().optional().describe('New base price'),
      pricingModel: z
        .enum(['one-time', 'subscription', 'delayed'])
        .optional()
        .describe('New pricing model'),
      display: z
        .enum(['featured', 'listed', 'unlisted', 'unpublished'])
        .optional()
        .describe('New display visibility'),

      subtitle: z.string().optional().describe('New subtitle'),
      description: z.string().optional().describe('New product description (HTML)'),
      summary: z.string().optional().describe('New "What You\'ll Get" section (HTML)'),

      interval: z
        .enum(['day', 'week', 'month', 'year'])
        .optional()
        .describe('Billing interval'),
      intervalCount: z.number().optional().describe('How often to charge based on interval'),
      trialPeriodDays: z.number().optional().describe('Number of free trial days'),

      collectAddressAndPhone: z
        .boolean()
        .optional()
        .describe('Whether to collect buyer address and phone'),
      shippingFee: z.number().optional().describe('Shipping fee'),
      shippingType: z.enum(['flat', 'per_quantity']).optional().describe('Shipping fee type'),

      categories: z
        .array(z.string())
        .optional()
        .describe('List of categories (replaces existing)'),
      tags: z.array(z.string()).optional().describe('List of tags (replaces existing)'),
      productImages: z
        .array(z.string())
        .optional()
        .describe('List of image URLs (replaces existing)'),
      productFiles: z
        .array(z.string())
        .optional()
        .describe('List of file URLs (replaces existing)'),

      downloadEmailSubject: z.string().optional().describe('Download email subject'),
      downloadEmailBody: z.string().optional().describe('Download email body (HTML)'),

      successUrl: z.string().optional().describe('Post-payment redirect URL'),
      successEmailSubject: z.string().optional().describe('Success email subject'),
      successEmailBody: z.string().optional().describe('Success email body (HTML)'),

      gatedPageUrl: z.string().optional().describe('Gated page URL slug'),
      gatedPageBody: z.string().optional().describe('Gated page body (HTML)'),

      isLicensed: z.boolean().optional().describe('Whether to generate license keys'),
      redemptionInstructions: z
        .string()
        .optional()
        .describe('License key redemption instructions (HTML)'),

      excludeFromAutomations: z
        .boolean()
        .optional()
        .describe('Whether to exclude from automations')
    })
  )
  .output(
    z.object({
      productId: z.string().describe('ID of the updated product'),
      title: z.string().describe('Product title'),
      url: z.string().describe('Product vanity URL slug'),
      currency: z.string().describe('Currency code'),
      price: z.number().describe('Product price'),
      pricingModel: z.string().describe('Pricing model'),
      display: z.string().describe('Display visibility')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, unknown> = {
      id: ctx.input.productId
    };

    if (ctx.input.title !== undefined) data.title = ctx.input.title;
    if (ctx.input.url !== undefined) data.url = ctx.input.url;
    if (ctx.input.currency !== undefined) data.currency = ctx.input.currency;
    if (ctx.input.price !== undefined) data.price = ctx.input.price;
    if (ctx.input.pricingModel !== undefined) data.pricing_model = ctx.input.pricingModel;
    if (ctx.input.display !== undefined) data.display = ctx.input.display;
    if (ctx.input.subtitle !== undefined) data.subtitle = ctx.input.subtitle;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.summary !== undefined) data.summary = ctx.input.summary;
    if (ctx.input.interval !== undefined) data.interval = ctx.input.interval;
    if (ctx.input.intervalCount !== undefined) data.interval_count = ctx.input.intervalCount;
    if (ctx.input.trialPeriodDays !== undefined)
      data.trial_period_days = ctx.input.trialPeriodDays;
    if (ctx.input.collectAddressAndPhone !== undefined)
      data.collect_address_and_phone = ctx.input.collectAddressAndPhone;
    if (ctx.input.shippingFee !== undefined) data.shipping_fee = ctx.input.shippingFee;
    if (ctx.input.shippingType !== undefined) data.shipping_type = ctx.input.shippingType;
    if (ctx.input.categories !== undefined) data.categories = ctx.input.categories;
    if (ctx.input.tags !== undefined) data.tags = ctx.input.tags;
    if (ctx.input.productImages !== undefined) data.productimages = ctx.input.productImages;
    if (ctx.input.productFiles !== undefined) data.productfiles = ctx.input.productFiles;
    if (ctx.input.downloadEmailSubject !== undefined)
      data.download_email_subject = ctx.input.downloadEmailSubject;
    if (ctx.input.downloadEmailBody !== undefined)
      data.download_email_body = ctx.input.downloadEmailBody;
    if (ctx.input.successUrl !== undefined) data.success_url = ctx.input.successUrl;
    if (ctx.input.successEmailSubject !== undefined)
      data.success_email_subject = ctx.input.successEmailSubject;
    if (ctx.input.successEmailBody !== undefined)
      data.success_email_body = ctx.input.successEmailBody;
    if (ctx.input.gatedPageUrl !== undefined) data.gated_page_url = ctx.input.gatedPageUrl;
    if (ctx.input.gatedPageBody !== undefined) data.gated_page_body = ctx.input.gatedPageBody;
    if (ctx.input.isLicensed !== undefined) data.is_licensed = ctx.input.isLicensed;
    if (ctx.input.redemptionInstructions !== undefined)
      data.redemption_instructions = ctx.input.redemptionInstructions;
    if (ctx.input.excludeFromAutomations !== undefined)
      data.exclude_from_automations = ctx.input.excludeFromAutomations;

    let result = await client.updateProduct(data);

    return {
      output: {
        productId: result.id as string,
        title: result.title as string,
        url: result.url as string,
        currency: result.currency as string,
        price: result.price as number,
        pricingModel: result.pricing_model as string,
        display: result.display as string
      },
      message: `Updated product **${result.title}** (ID: \`${result.id}\`).`
    };
  })
  .build();
