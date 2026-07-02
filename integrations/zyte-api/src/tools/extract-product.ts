import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let customAttributePropertySchema = z.object({
  type: z
    .string()
    .describe('Data type (e.g. "string", "integer", "number", "boolean", "array")'),
  description: z.string().describe('Natural language description of what to extract'),
  items: z
    .object({
      type: z.string().optional(),
      description: z.string().optional()
    })
    .optional()
    .describe('Schema for array items (when type is "array")')
});

export let extractProduct = SlateTool.create(spec, {
  name: 'Extract Product',
  key: 'extract_product',
  description: `Extract structured product data from any product page using AI-powered extraction. Returns fields such as name, price, currency, SKU, availability, description, images, brand, variants, ratings, and more — without writing any parsing code.

Supports custom attributes via natural language descriptions to extract additional fields beyond the default schema. Optionally include browser-rendered HTML or a screenshot alongside the extraction.`,
  instructions: [
    'Use extractFrom to control extraction source: "browserHtml" (default, best quality), "browserHtmlOnly" (good for JS-heavy pages), or "httpResponseBody" (fastest/cheapest).',
    'Custom attributes use natural language descriptions to define what extra data to extract.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      url: z.string().describe('URL of the product page'),
      extractFrom: z
        .enum(['httpResponseBody', 'browserHtml', 'browserHtmlOnly'])
        .optional()
        .describe(
          'Extraction source. "browserHtml" uses rendered HTML + visual features (default), "browserHtmlOnly" uses only rendered HTML, "httpResponseBody" uses raw HTTP response (fastest).'
        ),
      modelVersion: z
        .string()
        .optional()
        .describe('Pin a specific AI model version (e.g. "2024-09-16")'),
      customAttributes: z
        .record(z.string(), customAttributePropertySchema)
        .optional()
        .describe(
          'Custom attributes to extract, defined as an OpenAPI-style properties object with natural language descriptions'
        ),
      geolocation: z.string().optional().describe('Country code for request origin'),
      ipType: z
        .enum(['datacenter', 'residential'])
        .optional()
        .describe('IP address type to use'),
      device: z.enum(['desktop', 'mobile']).optional().describe('Device type for emulation'),
      includeBrowserHtml: z
        .boolean()
        .optional()
        .describe('Also return the browser-rendered HTML'),
      includeScreenshot: z
        .boolean()
        .optional()
        .describe('Also return a screenshot of the page')
    })
  )
  .output(
    z.object({
      url: z.string().describe('Final URL after any redirects'),
      statusCode: z.number().optional().describe('HTTP status code'),
      product: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Extracted product data including name, price, currency, sku, availability, description, brand, images, variants, ratings, and metadata'
        ),
      customAttributes: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Values of custom extracted attributes'),
      browserHtml: z.string().optional().describe('Browser-rendered HTML if requested'),
      screenshot: z.string().optional().describe('Base64-encoded screenshot if requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Extracting product data...');

    let productOptions =
      ctx.input.extractFrom || ctx.input.modelVersion
        ? {
            extractFrom: ctx.input.extractFrom,
            model: ctx.input.modelVersion
          }
        : undefined;

    let customAttributes = ctx.input.customAttributes
      ? { type: 'object' as const, properties: ctx.input.customAttributes }
      : undefined;

    let response = await client.extract({
      url: ctx.input.url,
      product: true,
      productOptions,
      customAttributes,
      browserHtml: ctx.input.includeBrowserHtml || undefined,
      screenshot: ctx.input.includeScreenshot || undefined,
      geolocation: ctx.input.geolocation,
      ipType: ctx.input.ipType,
      device: ctx.input.device
    });

    let productName = (response.product as Record<string, unknown> | undefined)?.name as
      | string
      | undefined;

    return {
      output: {
        url: response.url,
        statusCode: response.statusCode,
        product: response.product,
        customAttributes: response.customAttributes,
        browserHtml: response.browserHtml,
        screenshot: response.screenshot
      },
      message: productName
        ? `Extracted product: **${productName}** from ${response.url}`
        : `Extracted product data from **${response.url}**`
    };
  })
  .build();
