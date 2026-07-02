import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createSource = SlateTool.create(spec, {
  name: 'Create Source',
  key: 'create_source',
  description: `Create a new data source in BigML from a remote URL. The source is the first step in the ML pipeline — raw data is imported and parsed for further processing into datasets.
Supports CSV files, JSON, Excel files, and other formats accessible via URL.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      remoteUrl: z
        .string()
        .describe(
          'URL of the remote file to import (e.g., CSV, JSON, Excel). Supports HTTP/HTTPS, S3, Azure Blob, etc.'
        ),
      name: z.string().optional().describe('Name for the source'),
      sourceParser: z
        .object({
          separator: z.string().optional().describe('Field separator character'),
          header: z.boolean().optional().describe('Whether the file has a header row'),
          locale: z.string().optional().describe('Locale for parsing numbers (e.g., "en_US")'),
          missingTokens: z
            .array(z.string())
            .optional()
            .describe('Strings to treat as missing values')
        })
        .optional()
        .describe('Parser configuration for the source data'),
      tags: z.array(z.string()).optional().describe('Tags to assign to the source'),
      projectId: z.string().optional().describe('Project to associate the source with')
    })
  )
  .output(
    z.object({
      resourceId: z.string().describe('BigML resource ID for the created source'),
      name: z.string().optional().describe('Name of the source'),
      statusCode: z.number().describe('Status code of the source creation'),
      statusMessage: z.string().describe('Status message'),
      created: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let body: Record<string, any> = {
      remote: ctx.input.remoteUrl
    };

    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.tags) body.tags = ctx.input.tags;
    if (ctx.input.projectId) body.project = ctx.input.projectId;
    if (ctx.input.sourceParser) {
      let parser: Record<string, any> = {};
      if (ctx.input.sourceParser.separator !== undefined)
        parser.separator = ctx.input.sourceParser.separator;
      if (ctx.input.sourceParser.header !== undefined)
        parser.header = ctx.input.sourceParser.header;
      if (ctx.input.sourceParser.locale) parser.locale = ctx.input.sourceParser.locale;
      if (ctx.input.sourceParser.missingTokens)
        parser.missing_tokens = ctx.input.sourceParser.missingTokens;
      body.source_parser = parser;
    }

    let result = await client.createResource('source', body);

    return {
      output: {
        resourceId: result.resource,
        name: result.name,
        statusCode: result.status?.code ?? result.code,
        statusMessage: result.status?.message ?? 'Created',
        created: result.created
      },
      message: `Source **${result.resource}** created${result.name ? ` as "${result.name}"` : ''}. Status: ${result.status?.message ?? 'pending'}.`
    };
  })
  .build();
