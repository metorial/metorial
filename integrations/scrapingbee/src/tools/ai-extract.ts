import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let aiExtract = SlateTool.create(spec, {
  name: 'AI Data Extraction',
  key: 'ai_extract',
  description: `Extract data from a web page using AI-powered natural language queries. Describe what you need in plain English instead of writing CSS selectors. Supports both single questions and structured extraction rules.`,
  instructions: [
    'Use aiQuery for a single question about the page (e.g., "What is the price of this product?").',
    'Use aiExtractRules for structured extraction with multiple fields (e.g., { "productName": "name of the product", "price": "current price" }).',
    'Use aiSelector to focus extraction on a specific part of the page using a CSS selector.',
    'Provide either aiQuery or aiExtractRules, not both.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The full URL of the web page to extract data from'),
      aiQuery: z
        .string()
        .optional()
        .describe('A plain-English question to extract specific information from the page'),
      aiExtractRules: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Key-value pairs where keys are field names and values describe what data to extract in plain English'
        ),
      aiSelector: z
        .string()
        .optional()
        .describe('CSS selector to focus AI extraction on a specific part of the page'),
      renderJs: z
        .boolean()
        .optional()
        .describe('Enable JavaScript rendering for dynamic pages'),
      premiumProxy: z
        .boolean()
        .optional()
        .describe('Use premium proxies for difficult-to-scrape websites'),
      countryCode: z
        .string()
        .optional()
        .describe('Two-letter country code for geo-targeted proxy'),
      device: z.enum(['desktop', 'mobile']).optional().describe('Device type to emulate'),
      wait: z.number().optional().describe('Time in milliseconds to wait after page load'),
      waitFor: z
        .string()
        .optional()
        .describe('CSS selector to wait for before extracting data')
    })
  )
  .output(
    z.object({
      extractedData: z
        .any()
        .describe(
          'The AI-extracted data. For aiQuery, this is the answer string. For aiExtractRules, this is a JSON object with the extracted fields.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.aiExtract({
      url: ctx.input.url,
      aiQuery: ctx.input.aiQuery,
      aiExtractRules: ctx.input.aiExtractRules,
      aiSelector: ctx.input.aiSelector,
      renderJs: ctx.input.renderJs,
      premiumProxy: ctx.input.premiumProxy,
      countryCode: ctx.input.countryCode,
      device: ctx.input.device,
      wait: ctx.input.wait,
      waitFor: ctx.input.waitFor
    });

    return {
      output: {
        extractedData: result
      },
      message: ctx.input.aiQuery
        ? `AI extraction completed for **${ctx.input.url}** with query: "${ctx.input.aiQuery}"`
        : `AI extraction completed for **${ctx.input.url}** with ${Object.keys(ctx.input.aiExtractRules || {}).length} extraction rules.`
    };
  });
