import { isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let searchSourceSchema = z
  .object({
    name: z.string().describe('Name of the source'),
    url: z.string().describe('URL of the source'),
    snippet: z.string().describe('Relevant snippet from the source')
  })
  .passthrough();

let searchImageSchema = z
  .object({
    url: z.string().describe('URL of the image'),
    description: z.string().optional().describe('Description of the image')
  })
  .passthrough();

let searchResultItemSchema = z.object({
  name: z.string().describe('Title of the search result'),
  url: z.string().describe('URL of the search result'),
  content: z.string().describe('Content chunk from the search result')
});

let imageSearchResultSchema = z
  .object({
    type: z.literal('image').describe('Image result returned when includeImages is enabled'),
    name: z.string().describe('Title of the image result'),
    url: z.string().describe('URL of the image')
  })
  .passthrough();

export let webSearch = SlateTool.create(spec, {
  name: 'Web Search',
  key: 'web_search',
  description: `Search the web using natural language queries and retrieve real-time content. Supports two depth modes: **standard** for fast results and **deep** for comprehensive iterative searching. Returns results in three formats: a natural language answer with sources, raw search result chunks for LLM grounding, or structured data following a custom JSON schema.`,
  instructions: [
    'Use "standard" depth for quick lookups and "deep" depth when you need comprehensive, thorough results.',
    'Use "sourcedAnswer" output type to get a ready-to-use answer with citations.',
    'Use "searchResults" output type to get raw content chunks suitable for further processing or LLM grounding.',
    'Use "structured" output type with a structuredOutputSchema to extract specific data in a defined JSON format.',
    'When using "structured" output type, provide a valid JSON schema string in structuredOutputSchema.',
    'Use includeInlineCitations only with the "sourcedAnswer" output type.',
    'Use includeSources only with the "structured" output type to get source information alongside structured data.'
  ],
  constraints: [
    'Deep search may take significantly longer than standard search.',
    'The structuredOutputSchema parameter is required when outputType is "structured".',
    'Date filters use YYYY-MM-DD format.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Natural language search query'),
      depth: z
        .enum(['standard', 'deep'])
        .default('standard')
        .describe(
          'Search depth — "standard" for fast results, "deep" for comprehensive iterative searching'
        ),
      outputType: z
        .enum(['sourcedAnswer', 'searchResults', 'structured'])
        .default('sourcedAnswer')
        .describe(
          'Format of the response — "sourcedAnswer" for a natural language answer, "searchResults" for raw content chunks, "structured" for JSON schema-based extraction'
        ),
      structuredOutputSchema: z
        .string()
        .optional()
        .describe(
          'JSON schema string defining the desired response structure. Required when outputType is "structured".'
        ),
      fromDate: z.string().optional().describe('Filter results from this date (YYYY-MM-DD)'),
      toDate: z.string().optional().describe('Filter results up to this date (YYYY-MM-DD)'),
      includeDomains: z
        .array(z.string())
        .optional()
        .describe('Only include results from these domains'),
      excludeDomains: z
        .array(z.string())
        .optional()
        .describe('Exclude results from these domains'),
      maxResults: z.number().optional().describe('Maximum number of results to return'),
      includeImages: z.boolean().optional().describe('Whether to include images in results'),
      includeInlineCitations: z
        .boolean()
        .optional()
        .describe(
          'Whether the answer should include inline citations (only for sourcedAnswer output type)'
        ),
      includeSources: z
        .boolean()
        .optional()
        .describe(
          'Whether to include source info in structured responses (only for structured output type)'
        )
    })
  )
  .output(
    z
      .object({
        answer: z
          .string()
          .optional()
          .describe('Natural language answer (when outputType is sourcedAnswer)'),
        results: z
          .array(searchResultItemSchema)
          .optional()
          .describe('Search result content chunks (when outputType is searchResults)'),
        imageResults: z
          .array(imageSearchResultSchema)
          .optional()
          .describe(
            'Native image entries returned alongside text results when includeImages is enabled'
          ),
        images: z
          .array(searchImageSchema)
          .optional()
          .describe('Images found in search results'),
        sources: z
          .array(searchSourceSchema)
          .optional()
          .describe('Sources used for the answer'),
        structuredData: z
          .record(z.string(), z.unknown())
          .optional()
          .describe(
            'Complete provider response for structured output, including every custom field'
          ),
        raw: z
          .record(z.string(), z.unknown())
          .optional()
          .describe(
            'Complete unmodified provider response, including native result ordering and metadata'
          )
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.info(
      `Searching for: "${ctx.input.query}" (depth: ${ctx.input.depth}, outputType: ${ctx.input.outputType})`
    );

    let result = await client.search({
      query: ctx.input.query,
      depth: ctx.input.depth,
      outputType: ctx.input.outputType,
      structuredOutputSchema: ctx.input.structuredOutputSchema,
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      includeDomains: ctx.input.includeDomains,
      excludeDomains: ctx.input.excludeDomains,
      maxResults: ctx.input.maxResults,
      includeImages: ctx.input.includeImages,
      includeInlineCitations: ctx.input.includeInlineCitations,
      includeSources: ctx.input.includeSources
    });

    let resultRows = Array.isArray(result.results) ? result.results : undefined;
    let imageRows = resultRows?.filter(
      item => isApiErrorRecord(item) && item.type === 'image'
    );
    let textRows = resultRows?.filter(
      item => !isApiErrorRecord(item) || item.type !== 'image'
    );
    let output: Record<string, unknown> = {
      ...result,
      ...(textRows === undefined ? {} : { results: textRows }),
      imageResults: imageRows,
      raw: result
    };
    let messageParts: string[] = [];

    if (ctx.input.outputType === 'structured') {
      let results = z.array(searchResultItemSchema).safeParse(textRows);
      let imageResults = z.array(imageSearchResultSchema).safeParse(imageRows);
      let sources = z.array(searchSourceSchema).safeParse(result.sources);
      let images = z.array(searchImageSchema).safeParse(result.images);
      output = {
        structuredData: result,
        raw: result,
        answer: typeof result.answer === 'string' ? result.answer : undefined,
        results: results.success ? results.data : undefined,
        imageResults: imageResults.success ? imageResults.data : undefined,
        sources: sources.success ? sources.data : undefined,
        images: images.success ? images.data : undefined
      };
      messageParts.push('Structured search completed.');
    }
    if (
      ctx.input.outputType !== 'structured' &&
      typeof result.answer === 'string' &&
      result.answer
    ) {
      messageParts.push(
        `**Answer:** ${result.answer.substring(0, 200)}${result.answer.length > 200 ? '...' : ''}`
      );
    }
    if (Array.isArray(result.results) && result.results.length > 0) {
      messageParts.push(`Found **${result.results.length}** search result(s).`);
    }
    if (Array.isArray(result.sources) && result.sources.length > 0) {
      messageParts.push(`**${result.sources.length}** source(s) referenced.`);
    }
    if (Array.isArray(result.images) && result.images.length > 0) {
      messageParts.push(`**${result.images.length}** image(s) found.`);
    }
    if (imageRows && imageRows.length > 0) {
      messageParts.push(`**${imageRows.length}** image result(s) found.`);
    }

    let message =
      messageParts.length > 0
        ? messageParts.join('\n')
        : `Search completed for "${ctx.input.query}" with no results.`;

    return {
      output,
      message
    };
  })
  .build();
