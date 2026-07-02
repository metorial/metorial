import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extractData = SlateTool.create(spec, {
  name: 'Extract Data',
  key: 'extract_data',
  description: `Extract structured data from document content using Scrapfly's standalone Extraction API. Supports three extraction methods: AI auto-extraction with predefined models (product, article, review, real estate), LLM prompt-based extraction with natural language instructions, and custom template-based extraction with CSS/XPath/JMESPath rules. Accepts HTML, XML, JSON, CSV, RSS, Markdown, and plain text input.`,
  instructions: [
    'Provide the document content in **content** and specify the **contentType** (e.g., "text/html", "text/markdown").',
    'Choose exactly one extraction method: **extractionModel** for auto-extraction, **extractionPrompt** for LLM-based extraction, or **extractionTemplate** for rule-based extraction.',
    'For **extractionPrompt**, describe what data you want in natural language (e.g., "Extract the product name, price, and description as JSON").',
    'For inline extraction during scraping, use the Scrape Webpage tool with extraction parameters instead.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      content: z
        .string()
        .describe('Document content to extract data from (HTML, text, markdown, XML, etc.).'),
      contentType: z
        .enum([
          'text/html',
          'text/markdown',
          'text/plain',
          'text/xml',
          'application/json',
          'text/csv',
          'application/rss+xml'
        ])
        .optional()
        .describe('MIME type of the document content.'),
      charset: z
        .enum(['utf-8', 'ascii', 'auto'])
        .optional()
        .describe('Character encoding of the document.'),
      url: z
        .string()
        .optional()
        .describe('Base URL for converting relative URLs to absolute URLs in the document.'),
      extractionPrompt: z
        .string()
        .optional()
        .describe(
          'Natural language LLM prompt describing what to extract (e.g., "Extract all product prices and names as JSON").'
        ),
      extractionModel: z
        .enum(['product', 'article', 'review_list', 'real_estate_listing'])
        .optional()
        .describe('Predefined AI model for automatic extraction.'),
      extractionTemplate: z
        .string()
        .optional()
        .describe(
          'Custom extraction template (stored template name or ephemeral template as "ephemeral:base64(json_template)").'
        )
    })
  )
  .output(
    z.object({
      contentType: z.string().optional().describe('Content type of the extraction result.'),
      extractedData: z.any().describe('Extracted structured data.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.extract({
      body: ctx.input.content,
      contentType: ctx.input.contentType,
      charset: ctx.input.charset,
      url: ctx.input.url,
      extractionPrompt: ctx.input.extractionPrompt,
      extractionModel: ctx.input.extractionModel,
      extractionTemplate: ctx.input.extractionTemplate
    });

    let method = ctx.input.extractionPrompt
      ? 'LLM prompt'
      : ctx.input.extractionModel
        ? `AI model (${ctx.input.extractionModel})`
        : ctx.input.extractionTemplate
          ? 'template'
          : 'default';

    return {
      output: {
        contentType: result?.content_type,
        extractedData: result?.data
      },
      message: `Extracted data using **${method}** extraction. Content type: ${result?.content_type ?? 'unknown'}.`
    };
  })
  .build();
