import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type ExtractRequest } from '../lib/client';
import { spec } from '../spec';

let dataType = z.enum([
  'productList',
  'productNavigation',
  'articleList',
  'articleNavigation',
  'forumThread',
  'jobPosting',
  'jobPostingNavigation',
  'pageContent'
]);

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
    .describe('Schema for array items')
});

export let extractData = SlateTool.create(spec, {
  name: 'Extract Structured Data',
  key: 'extract_data',
  description: `Extract structured data from any web page using AI-powered extraction. Supports multiple data types beyond single products and articles:

- **productList** — Extract a list of products from a category or search results page
- **productNavigation** — Extract product navigation/pagination links
- **articleList** — Extract a list of articles from a listing page
- **articleNavigation** — Extract article navigation/pagination links
- **forumThread** — Extract forum thread content and replies
- **jobPosting** — Extract a single job posting's details
- **jobPostingNavigation** — Extract job listing navigation/pagination links
- **pageContent** — Generic extraction for any page type

For single product pages, use **Extract Product**. For single article pages, use **Extract Article**.`,
  instructions: [
    'Only one dataType can be used per request.',
    'Use extractFrom to control extraction source.',
    'Custom attributes allow additional fields via natural language descriptions.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      url: z.string().describe('URL of the page to extract from'),
      dataType: dataType.describe('Type of structured data to extract'),
      extractFrom: z
        .enum(['httpResponseBody', 'browserHtml', 'browserHtmlOnly'])
        .optional()
        .describe(
          'Extraction source. "browserHtml" (default), "browserHtmlOnly", or "httpResponseBody" (fastest).'
        ),
      modelVersion: z.string().optional().describe('Pin a specific AI model version'),
      customAttributes: z
        .record(z.string(), customAttributePropertySchema)
        .optional()
        .describe('Custom attributes to extract'),
      geolocation: z.string().optional().describe('Country code for request origin'),
      ipType: z
        .enum(['datacenter', 'residential'])
        .optional()
        .describe('IP address type to use'),
      device: z.enum(['desktop', 'mobile']).optional().describe('Device type for emulation')
    })
  )
  .output(
    z.object({
      url: z.string().describe('Final URL after any redirects'),
      statusCode: z.number().optional().describe('HTTP status code'),
      extractedData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Extracted structured data, varies by data type'),
      customAttributes: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Values of custom extracted attributes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress(`Extracting ${ctx.input.dataType} data...`);

    let options =
      ctx.input.extractFrom || ctx.input.modelVersion
        ? { extractFrom: ctx.input.extractFrom, model: ctx.input.modelVersion }
        : undefined;

    let customAttributes = ctx.input.customAttributes
      ? { type: 'object' as const, properties: ctx.input.customAttributes }
      : undefined;

    let request: ExtractRequest = {
      url: ctx.input.url,
      customAttributes,
      geolocation: ctx.input.geolocation,
      ipType: ctx.input.ipType,
      device: ctx.input.device
    };

    let dt = ctx.input.dataType;

    // Set the appropriate extraction flag and options
    request[dt] = true;
    let optionsKey = `${dt}Options` as keyof ExtractRequest;
    if (options) {
      (request as unknown as Record<string, unknown>)[optionsKey] = options;
    }

    let response = await client.extract(request);

    let extractedData = (response as unknown as Record<string, unknown>)[dt] as
      | Record<string, unknown>
      | undefined;

    return {
      output: {
        url: response.url,
        statusCode: response.statusCode,
        extractedData,
        customAttributes: response.customAttributes
      },
      message: `Extracted **${dt}** data from **${response.url}**`
    };
  })
  .build();
