import { SlateTool } from 'slates';
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
    'The Headless API is a premium add-on to the Dromo Enterprise plan.'
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
        .describe('JSON array of objects to import directly instead of uploading a file')
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
    let client = new DromoClient({ token: ctx.auth.token });

    let params: {
      schema_id: string;
      original_filename?: string;
      initial_data?: Record<string, any>[];
    } = {
      schema_id: ctx.input.schemaId
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
