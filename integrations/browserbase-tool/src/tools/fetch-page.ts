import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { browserbaseServiceError } from '../lib/errors';
import { spec } from '../spec';

export let fetchPage = SlateTool.create(spec, {
  name: 'Fetch Page',
  key: 'fetch_page',
  description: `Fetch a web page through Browserbase's cloud infrastructure. Returns raw content, markdown, or JSON extracted with a provided schema, plus headers, status code, and content type.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL to fetch'),
      allowRedirects: z
        .boolean()
        .optional()
        .describe('Follow HTTP redirects (default: false)'),
      allowInsecureSsl: z
        .boolean()
        .optional()
        .describe('Bypass TLS certificate verification (default: false)'),
      enableProxy: z.boolean().optional().describe('Enable proxy support (default: false)'),
      format: z
        .enum(['raw', 'markdown', 'json'])
        .optional()
        .describe(
          'Output format. Use raw for unchanged response body, markdown for page markdown, or json with schema for structured extraction.'
        ),
      schema: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('JSON Schema object used only when format is json.')
    })
  )
  .output(
    z.object({
      fetchId: z.string().describe('Unique fetch request identifier'),
      statusCode: z.number().describe('HTTP status code of the fetched response'),
      headers: z.record(z.string(), z.string()).describe('Response headers'),
      content: z
        .unknown()
        .describe('Response body content as string, or structured JSON for json format'),
      contentType: z.string().describe('MIME type of the response'),
      encoding: z.string().describe('Character encoding')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.format === 'json' && !ctx.input.schema) {
      throw browserbaseServiceError('schema is required when format is "json".');
    }

    if (ctx.input.schema && ctx.input.format !== 'json') {
      throw browserbaseServiceError('schema can only be provided when format is "json".');
    }

    let result = await client.fetchPage({
      url: ctx.input.url,
      allowRedirects: ctx.input.allowRedirects,
      allowInsecureSsl: ctx.input.allowInsecureSsl,
      proxies: ctx.input.enableProxy,
      format: ctx.input.format,
      schema: ctx.input.schema
    });

    return {
      output: {
        fetchId: result.fetchId,
        statusCode: result.statusCode,
        headers: result.headers,
        content: result.content,
        contentType: result.contentType,
        encoding: result.encoding
      },
      message: `Fetched **${ctx.input.url}** with status **${result.statusCode}** (${result.contentType}).`
    };
  })
  .build();
