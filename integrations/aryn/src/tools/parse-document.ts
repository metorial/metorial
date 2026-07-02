import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let parseDocument = SlateTool.create(spec, {
  name: 'Parse Document',
  key: 'parse_document',
  description: `Parse and segment a document into structured output using Aryn DocParse. Supports 30+ file formats including PDF, DOCX, PPTX, and more.

Provide a document via URL and configure parsing options including text extraction mode, table extraction, image summarization, OCR language, output format, and chunking.

Returns structured elements with labeled bounding boxes for titles, tables, images, and text. Output can be JSON (array of elements), Markdown, or HTML.`,
  instructions: [
    'Provide the document as a URL using fileUrl.',
    'Use outputFormat "json" for structured element data, "markdown" for readable text, or "html" for HTML output.',
    'Enable tableMode "standard" or "vision" to extract table cell-level content.',
    'Set summarizeImages to true to generate AI summaries of document images (Pay-As-You-Go only).'
  ],
  constraints: [
    'Image summarization is only available for Pay-As-You-Go users.',
    'Large documents may take several minutes to process.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      fileUrl: z.string().describe('URL of the document to parse'),
      outputFormat: z
        .enum(['json', 'markdown', 'html'])
        .optional()
        .default('json')
        .describe('Output format for the parsed document'),
      pipeline: z
        .enum(['standard', 'vision'])
        .optional()
        .describe(
          'Parsing pipeline: "standard" for traditional processing, "vision" for VLM-based parsing'
        ),
      textMode: z
        .enum(['auto', 'inline_fallback_to_ocr', 'ocr_standard', 'ocr_vision'])
        .optional()
        .describe('Text extraction mode'),
      tableMode: z
        .enum(['standard', 'vision', 'none', 'custom'])
        .optional()
        .describe('Table structure extraction mode'),
      summarizeImages: z
        .boolean()
        .optional()
        .describe('Generate AI summaries of images (PAYG only)'),
      extractImages: z.boolean().optional().describe('Extract images from the document'),
      ocrLanguage: z.string().optional().describe('OCR language (default: english)'),
      threshold: z
        .union([z.number(), z.literal('auto')])
        .optional()
        .describe('Bounding box confidence threshold (0-1 or "auto")'),
      selectedPages: z
        .array(z.union([z.number(), z.array(z.number())]))
        .optional()
        .describe('Specific pages or page ranges to process, e.g. [1, [5, 10]]'),
      docsetId: z
        .string()
        .optional()
        .describe('DocSet ID to store the parsed document in. Leave empty to use default.'),
      chunkingOptions: z
        .object({
          strategy: z.string().optional().describe('Chunking strategy, e.g. "context_rich"'),
          maxTokens: z.number().optional().describe('Maximum tokens per chunk'),
          tokenizer: z.string().optional().describe('Tokenizer to use'),
          mergeAcrossPages: z
            .boolean()
            .optional()
            .describe('Whether to merge chunks across pages')
        })
        .optional()
        .describe('Chunking configuration'),
      propertyExtraction: z
        .object({
          schema: z
            .object({
              properties: z.array(
                z.object({
                  name: z.string().describe('Property name'),
                  fieldType: z.string().describe('Property type: String, Number, or Boolean'),
                  description: z
                    .string()
                    .optional()
                    .describe('Guidance for extracting this property'),
                  defaultValue: z
                    .string()
                    .optional()
                    .describe('Default value if extraction fails'),
                  examples: z.array(z.string()).optional().describe('Example values')
                })
              )
            })
            .optional()
            .describe('Schema describing properties to extract'),
          suggestProperties: z
            .boolean()
            .optional()
            .describe('Ask DocParse to suggest a schema'),
          suggestPropertiesInstructions: z
            .string()
            .optional()
            .describe('Instructions for property suggestion')
        })
        .optional()
        .describe('Extract key-value pairs from documents like invoices, contracts, etc.')
    })
  )
  .output(
    z.object({
      status: z.number().optional().describe('HTTP status code from the partition response'),
      elements: z
        .array(z.any())
        .optional()
        .describe('Array of parsed document elements with type, bounding boxes, and content'),
      markdown: z
        .string()
        .optional()
        .describe('Markdown representation of the document (when outputFormat is markdown)'),
      html: z
        .string()
        .optional()
        .describe('HTML representation of the document (when outputFormat is html)'),
      suggestedSchema: z
        .any()
        .optional()
        .describe('Suggested property schema when suggestProperties is enabled'),
      extractedProperties: z
        .any()
        .optional()
        .describe('Extracted properties when propertyExtraction schema is provided')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let options: Record<string, any> = {};

    if (ctx.input.outputFormat) options.output_format = ctx.input.outputFormat;
    if (ctx.input.pipeline) options.pipeline = ctx.input.pipeline;
    if (ctx.input.textMode) options.text_mode = ctx.input.textMode;
    if (ctx.input.tableMode) options.table_mode = ctx.input.tableMode;
    if (ctx.input.summarizeImages !== undefined)
      options.summarize_images = ctx.input.summarizeImages;
    if (ctx.input.extractImages !== undefined)
      options.extract_images = ctx.input.extractImages;
    if (ctx.input.ocrLanguage) options.ocr_language = ctx.input.ocrLanguage;
    if (ctx.input.threshold !== undefined) options.threshold = ctx.input.threshold;
    if (ctx.input.selectedPages) options.selected_pages = ctx.input.selectedPages;
    if (ctx.input.docsetId) options.add_to_docset_id = ctx.input.docsetId;

    if (ctx.input.chunkingOptions) {
      let chunking: Record<string, any> = {};
      if (ctx.input.chunkingOptions.strategy)
        chunking.strategy = ctx.input.chunkingOptions.strategy;
      if (ctx.input.chunkingOptions.maxTokens)
        chunking.max_tokens = ctx.input.chunkingOptions.maxTokens;
      if (ctx.input.chunkingOptions.tokenizer)
        chunking.tokenizer = ctx.input.chunkingOptions.tokenizer;
      if (ctx.input.chunkingOptions.mergeAcrossPages !== undefined)
        chunking.merge_across_pages = ctx.input.chunkingOptions.mergeAcrossPages;
      options.chunking_options = chunking;
    }

    if (ctx.input.propertyExtraction) {
      let pe: Record<string, any> = {};
      if (ctx.input.propertyExtraction.schema) {
        pe.schema = {
          properties: ctx.input.propertyExtraction.schema.properties.map(p => ({
            name: p.name,
            field_type: p.fieldType,
            description: p.description,
            default: p.defaultValue,
            examples: p.examples
          }))
        };
      }
      if (ctx.input.propertyExtraction.suggestProperties !== undefined)
        pe.suggest_properties = ctx.input.propertyExtraction.suggestProperties;
      if (ctx.input.propertyExtraction.suggestPropertiesInstructions)
        pe.suggest_properties_instructions =
          ctx.input.propertyExtraction.suggestPropertiesInstructions;
      options.property_extraction = pe;
    }

    ctx.info(`Parsing document from URL: ${ctx.input.fileUrl}`);

    let result = await client.partitionDocumentFromUrl(
      ctx.input.fileUrl,
      Object.keys(options).length > 0 ? options : undefined
    );

    let elementCount = result?.elements?.length ?? 0;

    return {
      output: {
        status: result?.status,
        elements: result?.elements,
        markdown: result?.markdown,
        html: result?.html,
        suggestedSchema: result?.suggested_schema,
        extractedProperties: result?.extracted_properties
      },
      message: `Successfully parsed document. ${elementCount > 0 ? `Extracted **${elementCount} elements**.` : `Output format: **${ctx.input.outputFormat}**.`}`
    };
  })
  .build();
