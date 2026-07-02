import { SlateTool } from 'slates';
import { z } from 'zod';
import { DiffbotClient } from '../lib/client';
import { spec } from '../spec';

let extractedObjectSchema = z
  .object({
    type: z.string().optional().describe('Type of the extracted object'),
    title: z.string().optional().describe('Title of the page or content'),
    text: z.string().optional().describe('Extracted plain text content'),
    html: z.string().optional().describe('Extracted HTML content'),
    date: z.string().optional().describe('Date associated with the content'),
    author: z.string().optional().describe('Author of the content'),
    pageUrl: z.string().optional().describe('URL of the processed page'),
    resolvedPageUrl: z.string().optional().describe('Resolved/canonical URL'),
    diffbotUri: z.string().optional().describe('Diffbot URI for the entity'),
    images: z
      .array(
        z.object({
          url: z.string().optional().describe('Image URL'),
          title: z.string().optional().describe('Image title or caption'),
          width: z.number().optional().describe('Image width in pixels'),
          height: z.number().optional().describe('Image height in pixels')
        })
      )
      .optional()
      .describe('Images found on the page'),
    tags: z
      .array(
        z.object({
          label: z.string().optional().describe('Tag label'),
          score: z.number().optional().describe('Relevance score'),
          uri: z.string().optional().describe('URI for the tag entity')
        })
      )
      .optional()
      .describe('Tags/topics extracted from the content')
  })
  .passthrough();

export let extractPage = SlateTool.create(spec, {
  name: 'Extract Page',
  key: 'extract_page',
  description: `Extract structured data from a web page using Diffbot's AI-powered extraction engine. Supports automatic page type detection or targeted extraction for articles, products, discussions, images, videos, lists, events, and job postings. Can also process raw HTML/text content directly.`,
  instructions: [
    'Use **analyze** as the extraction type to automatically detect and extract content from any page type.',
    'Use a specific type (article, product, etc.) when you know the page type for more targeted extraction.',
    'To extract from non-public pages, provide the HTML content in the **body** field.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('URL of the web page to extract data from'),
      extractionType: z
        .enum([
          'analyze',
          'article',
          'product',
          'discussion',
          'image',
          'video',
          'list',
          'event',
          'job'
        ])
        .default('analyze')
        .describe('Type of extraction to perform. Use "analyze" for auto-detection.'),
      fields: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of fields to return (e.g., "title,text,images"). Returns all fields by default.'
        ),
      timeout: z
        .number()
        .optional()
        .describe('Timeout in milliseconds for the extraction request'),
      paging: z
        .boolean()
        .optional()
        .describe('Whether to follow pagination links for multi-page articles'),
      includeDiscussion: z
        .boolean()
        .optional()
        .describe('Whether to include comment/discussion threads found on the page'),
      body: z
        .string()
        .optional()
        .describe('Raw HTML or text content to extract from, instead of fetching the URL'),
      contentType: z
        .string()
        .optional()
        .describe('MIME type of the body content (e.g., "text/html", "text/plain")')
    })
  )
  .output(
    z.object({
      requestUrl: z.string().optional().describe('The API request URL'),
      extractedType: z.string().optional().describe('Detected or specified page type'),
      objects: z.array(extractedObjectSchema).describe('Array of extracted data objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DiffbotClient({ token: ctx.auth.token });

    let result = await client.extractPage({
      url: ctx.input.url,
      type: ctx.input.extractionType,
      fields: ctx.input.fields,
      timeout: ctx.input.timeout,
      paging: ctx.input.paging,
      discussion: ctx.input.includeDiscussion,
      body: ctx.input.body,
      contentType: ctx.input.contentType
    });

    let objects = result.objects || [];
    let extractedType = result.type || ctx.input.extractionType;

    return {
      output: {
        requestUrl: result.request?.pageUrl || ctx.input.url,
        extractedType,
        objects
      },
      message: `Extracted **${objects.length}** object(s) of type **${extractedType}** from ${ctx.input.url}.`
    };
  })
  .build();
