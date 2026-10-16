import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requireHeadoutId, requireHeadoutText } from '../lib/response';
import { spec } from '../spec';

let mapLocation = (location: any) => {
  if (!location) return undefined;
  let address = location.address;
  return {
    ...location,
    latitude: location.latitude ?? location.geolocation?.latitude ?? undefined,
    longitude: location.longitude ?? location.geolocation?.longitude ?? undefined,
    address:
      typeof address === 'string'
        ? address
        : address
          ? [
              address.addressLine1,
              address.addressLine2,
              address.cityName,
              address.state,
              address.postalCode,
              address.countryName
            ]
              .filter(Boolean)
              .join(', ')
          : undefined
  };
};

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
    raw: z
      .unknown()
      .optional()
      .describe('Complete product response, including location choices and booking policies'),
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
        .describe('Override language (EN, ES, FR, IT, DE, PT, NL, PL)'),
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
      ...product,
      raw: product,
      productId: requireHeadoutId(product?.id ?? product?.productId, 'product ID'),
      name: requireHeadoutText(product.name, 'product name'),
      canonicalUrl: product.canonicalUrl ?? product.url,
      cityCode: product.city?.code ?? product.cityCode,
      currency: product.currency,
      images: product.images ?? product.media ?? undefined,
      content: Array.isArray(product.content)
        ? product.content
        : (product.contentListHtml ??
          (product.content
            ? Object.entries(product.content)
                .filter(([, value]) => typeof value === 'string')
                .map(([title, html]) => ({ title, html }))
            : undefined)),
      startLocation: mapLocation(product.startLocation ?? product.address),
      endLocation: mapLocation(product.endLocation),
      productType: product.productType,
      ratingCumulative:
        product.ratingCumulative ??
        (product.reviewsSummary
          ? {
              avg: product.reviewsSummary.averageRating ?? undefined,
              count: product.reviewsSummary.ratingsCount ?? undefined
            }
          : undefined),
      hasInstantConfirmation: product.hasInstantConfirmation,
      hasMobileTicket: product.hasMobileTicket,
      variants: product.variants?.map((v: any) => ({
        ...v,
        variantId: requireHeadoutId(v?.id ?? v?.variantId, 'variant ID'),
        name: v.name ?? undefined,
        description: v.description ?? undefined,
        inventoryType: v.inventoryType ?? undefined,
        duration: v.duration ?? undefined,
        priceType:
          v.priceType ??
          v.pricing?.profileType ??
          product.pricing?.profileType ??
          product.pricing?.type,
        pax: v.pax,
        cashback: v.cashback,
        ticketDeliveryInfoHtml: v.ticketDeliveryInfoHtml ?? undefined,
        inputFields: v.inputFields?.map((f: any) => ({
          ...f,
          fieldId: requireHeadoutId(f?.id ?? f?.fieldId, 'booking input field ID'),
          name: requireHeadoutText(f.name, 'booking input field name'),
          dataType: f.dataType,
          level: f.level,
          validation: f.validation
            ? {
                ...Object.fromEntries(
                  Object.entries(f.validation).filter(([, value]) => value != null)
                ),
                values: f.validation.values?.map((value: any) =>
                  typeof value === 'string'
                    ? value
                    : requireHeadoutId(value?.id, 'predefined location ID')
                )
              }
            : undefined
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
