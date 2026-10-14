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

export let extractArticle = SlateTool.create(spec, {
  name: 'Extract Article',
  key: 'extract_article',
  description: `Extract structured article data from any article or blog page using AI-powered extraction. Returns fields such as headline, article body (plain text and HTML), authors, publication date, description, language, images, and more.

Supports custom attributes for extracting additional data beyond the default schema.`,
  instructions: [
    'Use browserHtml for rendered extraction or httpResponseBody for HTTP extraction. The legacy browserHtmlOnly option is unsupported by the current API.',
    'Model pinning is currently supported only by Extract Product; omit modelVersion here.',
    'Custom attributes use natural language descriptions to define what extra data to extract.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      url: z.string().describe('URL of the article page'),
      extractFrom: z
        .enum(['httpResponseBody', 'browserHtml', 'browserHtmlOnly'])
        .optional()
        .describe(
          'Extraction source. Use browserHtml for rendered HTML or httpResponseBody for raw HTTP. The legacy browserHtmlOnly option is unsupported by the current API.'
        ),
      modelVersion: z
        .string()
        .optional()
        .describe('Legacy model option; omit for article extraction'),
      customAttributes: z
        .record(z.string(), customAttributePropertySchema)
        .optional()
        .describe('Custom attributes to extract'),
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
      article: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Extracted article data including headline, articleBody, articleBodyHtml, authors, datePublished, description, inLanguage, images, and metadata'
        ),
      customAttributes: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom extraction response containing values and metadata'),
      browserHtml: z.string().optional().describe('Browser-rendered HTML if requested'),
      screenshot: z.string().optional().describe('Base64-encoded screenshot if requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Extracting article data...');

    let articleOptions =
      ctx.input.extractFrom || ctx.input.modelVersion
        ? {
            extractFrom: ctx.input.extractFrom,
            model: ctx.input.modelVersion
          }
        : undefined;

    let customAttributes = ctx.input.customAttributes;

    let response = await client.extract({
      url: ctx.input.url,
      article: true,
      articleOptions,
      customAttributes,
      browserHtml: ctx.input.includeBrowserHtml || undefined,
      screenshot: ctx.input.includeScreenshot || undefined,
      screenshotOptions: ctx.input.includeScreenshot ? { format: 'jpeg' } : undefined,
      geolocation: ctx.input.geolocation,
      ipType: ctx.input.ipType,
      device: ctx.input.device
    });

    if (response.browserHtml !== undefined) {
      await ctx.addAttachment({
        type: 'content',
        content: new Response(response.browserHtml, {
          headers: { 'content-type': 'text/html; charset=utf-8' }
        }),
        filename: 'article.html'
      });
    }
    if (response.screenshot) {
      await ctx.addAttachment({
        type: 'content',
        content: new Response(Buffer.from(response.screenshot, 'base64'), {
          headers: { 'content-type': 'image/jpeg' }
        }),
        filename: 'article.jpg'
      });
    }

    let headline = (response.article as Record<string, unknown> | undefined)?.headline as
      | string
      | undefined;

    return {
      output: {
        url: response.url,
        statusCode: response.statusCode,
        article: response.article,
        customAttributes: response.customAttributes,
        browserHtml: response.browserHtml,
        screenshot: response.screenshot
      },
      message: headline
        ? `Extracted article: **${headline}** from ${response.url}`
        : `Extracted article data from **${response.url}**`
    };
  })
  .build();
