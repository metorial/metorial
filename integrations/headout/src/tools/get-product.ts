import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let variantInputFieldSchema = z
  .object({
    fieldId: z.string().describe('Input field identifier'),
    name: z.string().describe('Display name'),
    dataType: z.string().describe('Data type (INT, FLOAT, STRING, BOOL, ENUM)'),
    level: z
      .string()
      .describe('Level at which the field applies (PRIMARY_CUSTOMER, ALL_CUSTOMERS, VARIANT)'),
    validation: z
      .object({
        required: z.boolean().optional(),
        regex: z.string().optional(),
        minLength: z.number().optional(),
        maxLength: z.number().optional(),
        minValue: z.number().optional(),
        maxValue: z.number().optional(),
        values: z.array(z.string()).optional()
      })
      .optional()
      .describe('Validation rules for the field')
  })
  .passthrough();

let variantSchema = z
  .object({
    variantId: z.string().describe('Unique variant identifier'),
    name: z.string().optional().describe('Variant name'),
    description: z.string().optional().describe('Variant description'),
    inventoryType: z
      .string()
      .optional()
      .describe('Inventory type (e.g., FIXED_START_FIXED_DURATION)'),
    duration: z.number().optional().describe('Duration in milliseconds'),
    priceType: z.string().optional().describe('PER_PERSON or PER_GROUP'),
    pax: z
      .object({
        min: z.number().optional(),
        max: z.number().optional()
      })
      .optional()
      .describe('Min/max participants'),
    cashback: z
      .object({
        value: z.number().optional(),
        type: z.string().optional()
      })
      .optional()
      .describe('Cashback details'),
    ticketDeliveryInfoHtml: z.string().optional(),
    inputFields: z
      .array(variantInputFieldSchema)
      .optional()
      .describe('Required input fields for booking')
  })
  .passthrough();

let productSchema = z
  .object({
    productId: z.string().describe('Unique product identifier'),
    name: z.string().describe('Product name'),
    canonicalUrl: z.string().optional().describe('Canonical product URL'),
    cityCode: z.string().optional().describe('City code'),
    currency: z
      .object({
        code: z.string().optional(),
        name: z.string().optional(),
        symbol: z.string().optional()
      })
      .optional(),
    images: z
      .array(
        z
          .object({
            url: z.string().optional()
          })
          .passthrough()
      )
      .optional()
      .describe('Product images'),
    content: z
      .array(
        z.object({
          title: z.string().optional(),
          html: z.string().optional()
        })
      )
      .optional()
      .describe('Rich text content sections'),
    startLocation: z
      .object({
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        address: z.string().optional()
      })
      .passthrough()
      .optional(),
    endLocation: z
      .object({
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        address: z.string().optional()
      })
      .passthrough()
      .optional(),
    productType: z.string().optional(),
    ratingCumulative: z
      .object({
        avg: z.number().optional(),
        count: z.number().optional()
      })
      .optional(),
    hasInstantConfirmation: z.boolean().optional(),
    hasMobileTicket: z.boolean().optional(),
    variants: z.array(variantSchema).optional().describe('Bookable variants for this product')
  })
  .passthrough();

export let getProduct = SlateTool.create(spec, {
  name: 'Get Product Details',
  key: 'get_product',
  description: `Retrieve full details of a specific Headout product including images, descriptions, FAQs, reviews, variant information, and required booking fields.
Each product can have multiple variants (e.g., "Skip the Line", "General Admission") with their own pricing, inventory type, and required input fields.`,
  instructions: [
    'Use a product ID obtained from the "Search Products" tool.',
    'Variant input fields describe the data you need to collect from the customer for booking (e.g., name, email, phone).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      productId: z.string().describe('The Headout product ID'),
      currencyCode: z.string().optional().describe('Override currency for pricing (ISO 4217)'),
      languageCode: z
        .string()
        .optional()
        .describe('Override language (EN, ES, FR, IT, DE, PT, NL)'),
      fetchVariants: z
        .boolean()
        .optional()
        .describe('Whether to include variant details (default: true)')
    })
  )
  .output(productSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      languageCode: ctx.config.languageCode,
      currencyCode: ctx.config.currencyCode
    });

    let product = await client.getProduct(ctx.input.productId, {
      currencyCode: ctx.input.currencyCode,
      language: ctx.input.languageCode,
      fetchVariants: ctx.input.fetchVariants
    });

    let mapped = {
      productId: String(product.id ?? product.productId ?? ''),
      name: product.name ?? '',
      canonicalUrl: product.canonicalUrl ?? product.url,
      cityCode: product.city?.code ?? product.cityCode,
      currency: product.currency,
      images: product.images,
      content: product.content,
      startLocation: product.startLocation,
      endLocation: product.endLocation,
      productType: product.productType,
      ratingCumulative: product.ratingCumulative,
      hasInstantConfirmation: product.hasInstantConfirmation,
      hasMobileTicket: product.hasMobileTicket,
      variants: product.variants?.map((v: any) => ({
        variantId: String(v.id ?? v.variantId ?? ''),
        name: v.name,
        description: v.description,
        inventoryType: v.inventoryType,
        duration: v.duration,
        priceType: v.priceType,
        pax: v.pax,
        cashback: v.cashback,
        ticketDeliveryInfoHtml: v.ticketDeliveryInfoHtml,
        inputFields: v.inputFields?.map((f: any) => ({
          fieldId: String(f.id ?? f.fieldId ?? ''),
          name: f.name,
          dataType: f.dataType,
          level: f.level,
          validation: f.validation
        }))
      }))
    };

    let variantCount = mapped.variants?.length ?? 0;
    return {
      output: mapped,
      message: `Retrieved product **${mapped.name}** (ID: ${mapped.productId}) with ${variantCount} variant${variantCount !== 1 ? 's' : ''}.`
    };
  })
  .build();
