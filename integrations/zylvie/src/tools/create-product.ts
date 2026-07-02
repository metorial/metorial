import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProduct = SlateTool.create(spec, {
  name: 'Create Product',
  key: 'create_product',
  description: `Create a new digital product in your Zylvie store. Supports one-time payments, subscriptions, and delayed payment pricing models. You can configure display visibility, images, downloadable files, post-purchase emails, gated member pages, and license key generation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('The title of your product'),
      url: z
        .string()
        .describe(
          'Vanity URL slug for the product (must be unique; alphanumeric, underscore, hyphen, or dot only)'
        ),
      currency: z
        .string()
        .describe('Lowercase 3-letter ISO currency code (e.g. "usd", "eur")'),
      price: z.number().describe('Base price of the product'),
      pricingModel: z
        .enum(['one-time', 'subscription', 'delayed'])
        .describe('Pricing model for the product'),
      display: z
        .enum(['featured', 'listed', 'unlisted', 'unpublished'])
        .describe('Display visibility of the product'),

      subtitle: z.string().optional().describe('Subtitle appearing below the title'),
      description: z.string().optional().describe('Product description in HTML format'),
      summary: z.string().optional().describe('"What You\'ll Get" section in HTML format'),

      interval: z
        .enum(['day', 'week', 'month', 'year'])
        .optional()
        .describe('Billing interval (required for subscriptions)'),
      intervalCount: z.number().optional().describe('How often to charge based on interval'),
      trialPeriodDays: z
        .number()
        .optional()
        .describe('Number of free trial days before charging'),

      collectAddressAndPhone: z
        .boolean()
        .optional()
        .describe('Whether to collect buyer address and phone at checkout'),
      shippingFee: z.number().optional().describe('Shipping fee for shipped products'),
      shippingType: z.enum(['flat', 'per_quantity']).optional().describe('Shipping fee type'),

      categories: z
        .array(z.string())
        .optional()
        .describe('List of categories for this product'),
      tags: z.array(z.string()).optional().describe('List of tags for this product'),
      productImages: z
        .array(z.string())
        .optional()
        .describe('List of image URLs for this product'),
      productFiles: z
        .array(z.string())
        .optional()
        .describe('List of file URLs for this product'),

      downloadEmailSubject: z.string().optional().describe('Subject for the download email'),
      downloadEmailBody: z.string().optional().describe('HTML body for the download email'),

      successUrl: z
        .string()
        .optional()
        .describe('URL to redirect buyers to after successful payment'),
      successEmailSubject: z.string().optional().describe('Subject for the success email'),
      successEmailBody: z.string().optional().describe('HTML body for the success email'),

      gatedPageUrl: z
        .string()
        .optional()
        .describe('URL slug for the gated page buyers can access after purchase'),
      gatedPageBody: z.string().optional().describe('HTML body content for the gated page'),

      isLicensed: z
        .boolean()
        .optional()
        .describe('Whether to generate unique license keys for each purchase'),
      redemptionInstructions: z
        .string()
        .optional()
        .describe('Instructions for redeeming license keys (HTML)'),

      excludeFromAutomations: z
        .boolean()
        .optional()
        .describe('Whether to exclude from workflow automations')
    })
  )
  .output(
    z.object({
      productId: z.string().describe('ID of the created product'),
      created: z.number().describe('Unix timestamp of creation'),
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
      title: ctx.input.title,
      url: ctx.input.url,
      currency: ctx.input.currency,
      price: ctx.input.price,
      pricing_model: ctx.input.pricingModel,
      display: ctx.input.display
    };

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

    let result = await client.createProduct(data);

    return {
      output: {
        productId: result.id as string,
        created: result.created as number,
        title: result.title as string,
        url: result.url as string,
        currency: result.currency as string,
        price: result.price as number,
        pricingModel: result.pricing_model as string,
        display: result.display as string
      },
      message: `Created product **${result.title}** (ID: \`${result.id}\`) with ${ctx.input.pricingModel} pricing at ${ctx.input.price} ${ctx.input.currency.toUpperCase()}.`
    };
  })
  .build();
