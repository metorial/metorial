import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { DromoClient } from '../lib/client';
import { spec } from '../spec';

export let createHeadlessImport = SlateTool.create(spec, {
  name: 'Create Headless Import',
  key: 'create_headless_import',
  description: `Creates a new headless (server-side) import. You can either provide a filename to get a pre-signed upload URL for file upload, or provide structured JSON data directly via the \`initialData\` parameter.`,
  instructions: [
    'Provide either `originalFilename` (for file-based imports) or `initialData` (for JSON-based imports), not both.',
    'When using file upload, use the returned `uploadUrl` to PUT the file contents within 30 minutes.',
    'The Headless API requires the Dromo Headless premium add-on.'
  ],
  constraints: ['Rate limit: 20 requests per minute for creating headless imports.']
})
  .input(
    z.object({
      schemaId: z.string().describe('ID of the saved schema to use for this import'),
      originalFilename: z
        .string()
        .optional()
        .describe('Original filename of the file to import (e.g., "data.csv")'),
      initialData: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe(
          'JSON array of objects to import directly instead of uploading a file; maximum 15 MB'
        ),
      settings: z
        .record(z.string(), z.any())
        .optional()
        .describe('Settings that override the saved schema for this import'),
      hooks: z
        .record(z.string(), z.any())
        .optional()
        .describe('Serializable hooks that override the saved schema for this import'),
      importMetadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Import metadata, including an optional user object')
    })
  )
  .output(
    z.object({
      importId: z.string().describe('Unique identifier of the created headless import'),
      uploadUrl: z
        .string()
        .optional()
        .describe('Pre-signed URL to upload the file to (PUT request with binary body)'),
      status: z.string().describe('Initial status of the import')
    })
  )
  .handleInvocation(async ctx => {
    if ((ctx.input.initialData !== undefined) === (ctx.input.originalFilename !== undefined)) {
      throw createApiServiceError('Provide exactly one of originalFilename or initialData.');
    }
    if (ctx.input.originalFilename !== undefined && !ctx.input.originalFilename.trim()) {
      throw createApiServiceError('Provide a non-empty originalFilename.');
    }
    if (
      ctx.input.initialData !== undefined &&
      Buffer.byteLength(JSON.stringify(ctx.input.initialData), 'utf8') > 15_000_000
    ) {
      throw createApiServiceError(
        'initialData must be at most 15 MB. Upload a file for larger imports.'
      );
    }
    let client = new DromoClient({ token: ctx.auth.token });

    let params: {
      schema_id: string;
      original_filename?: string;
      initial_data?: Record<string, any>[];
      settings?: Record<string, any>;
      hooks?: Record<string, any>;
      import_metadata?: Record<string, any>;
    } = {
      schema_id: ctx.input.schemaId,
      settings: ctx.input.settings,
      hooks: ctx.input.hooks,
      import_metadata: ctx.input.importMetadata
    };

    if (ctx.input.initialData) {
      params.initial_data = ctx.input.initialData;
    } else if (ctx.input.originalFilename) {
      params.original_filename = ctx.input.originalFilename;
    }

    let result = await client.createHeadlessImport(params);

    let message = `Created headless import **${result.id}** (status: ${result.status}).`;
    if (result.upload) {
      message += ` Upload your file via PUT to the returned uploadUrl within 30 minutes.`;
    }

    return {
      output: {
        importId: result.id,
        uploadUrl: result.upload,
        status: result.status
      },
      message
    };
  })
  .build();
