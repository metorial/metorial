import { createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { requireProjectRef } from '../lib/errors';
import { spec } from '../spec';

export let getDatabaseSchema = SlateTool.create(spec, {
  name: 'Get Database Schema',
  key: 'get_database_schema',
  description: `Export Supabase database schema metadata for development workflows. Generate the PostgREST OpenAPI specification or TypeScript database types for selected schemas.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectRef: z
        .string()
        .optional()
        .describe('Project reference ID (uses config.projectRef if not provided)'),
      format: z
        .enum(['openapi', 'typescript'])
        .describe('Schema artifact to generate: openapi or typescript'),
      schema: z
        .string()
        .optional()
        .describe('Database schema for OpenAPI generation (defaults to public)'),
      includedSchemas: z
        .string()
        .optional()
        .describe(
          'Comma-separated schemas for TypeScript type generation (defaults to public)'
        )
    })
  )
  .output(
    z.object({
      format: z.string().describe('Generated schema artifact format'),
      contentType: z.string().describe('Attachment MIME type'),
      attachmentCount: z.number().describe('Number of returned attachments')
    })
  )
  .handleInvocation(async ctx => {
    let projectRef = requireProjectRef(ctx.input.projectRef ?? ctx.config.projectRef);
    let client = new ManagementClient(ctx.auth.token);

    if (ctx.input.format === 'openapi') {
      let openApi = await client.getDatabaseOpenApi(projectRef, ctx.input.schema);
      let content = JSON.stringify(openApi, null, 2);
      return {
        output: {
          format: 'openapi',
          contentType: 'application/json',
          attachmentCount: 1
        },
        attachments: [createTextAttachment(content, 'application/json')],
        message: `Generated PostgREST OpenAPI schema for project **${projectRef}**.`
      };
    }

    let result = await client.generateTypescriptTypes(projectRef, ctx.input.includedSchemas);
    let content = typeof result?.types === 'string' ? result.types : '';

    return {
      output: {
        format: 'typescript',
        contentType: 'text/typescript',
        attachmentCount: 1
      },
      attachments: [createTextAttachment(content, 'text/typescript')],
      message: `Generated TypeScript database types for project **${projectRef}**.`
    };
  })
  .build();
