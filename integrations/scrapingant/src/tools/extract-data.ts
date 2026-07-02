import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extractData = SlateTool.create(spec, {
  name: 'Extract Structured Data',
  key: 'extract_data',
  description: `Extract structured data from a web page using AI. Provide a free-form description of the data fields you want, and the AI model will extract them into a JSON object with camelCase property names.
Useful for extracting product info, article content, pricing, reviews, or any structured data from a webpage without writing custom parsers.`,
  instructions: [
    'Describe the data you want in `extractProperties` as a comma-separated list, e.g. "product title, price, full description".',
    'You can specify types and nested structures, e.g. "price(number), reviews(list: review title, review content)".',
    'Be as specific as possible for best results — include details about format, currency, etc.',
    'Property descriptions work best in English.'
  ],
  constraints: [
    'AI extraction cost is based on the number of characters in the Markdown version of the page plus output characters.',
    'The AI extractor works only with text content extracted via Markdown — it does not process styles, JavaScript, or HTML tags.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL of the web page to extract data from'),
      extractProperties: z
        .string()
        .describe(
          'Free-form description of data fields to extract, e.g. "title, price(number), description, reviews(list: author, rating, text)"'
        ),
      browser: z
        .boolean()
        .optional()
        .describe('Enable headless browser rendering. Defaults to true.'),
      timeout: z
        .number()
        .min(5)
        .max(60)
        .optional()
        .describe('Request timeout in seconds (5-60). Defaults to 60.'),
      proxyType: z
        .enum(['datacenter', 'residential'])
        .optional()
        .describe('Proxy type to use. Datacenter is default and cheapest.'),
      proxyCountry: z
        .string()
        .optional()
        .describe('Two-letter country code for geo-targeted proxy (e.g. "US", "GB", "DE")'),
      waitForSelector: z
        .string()
        .optional()
        .describe('CSS selector to wait for before extracting data'),
      cookies: z
        .string()
        .optional()
        .describe(
          'Custom cookies in format: cookie_name1=cookie_value1;cookie_name2=cookie_value2'
        )
    })
  )
  .output(
    z.object({
      extractedData: z
        .record(z.string(), z.unknown())
        .describe('The extracted structured data as a JSON object with camelCase keys')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.extractData({
      url: ctx.input.url,
      extractProperties: ctx.input.extractProperties,
      browser: ctx.input.browser,
      timeout: ctx.input.timeout,
      proxyType: ctx.input.proxyType,
      proxyCountry: ctx.input.proxyCountry,
      waitForSelector: ctx.input.waitForSelector,
      cookies: ctx.input.cookies
    });

    return {
      output: { extractedData: result },
      message: `Successfully extracted structured data from **${ctx.input.url}** with properties: ${ctx.input.extractProperties}.`
    };
  })
  .build();
