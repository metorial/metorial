import { SlateTool } from 'slates';
import { z } from 'zod';
import { StitchImportClient } from '../lib/client';
import { spec } from '../spec';

export let pushData = SlateTool.create(spec, {
  name: 'Push Data',
  key: 'push_data',
  description: `Pushes data records into Stitch via the Import API (Batch endpoint). Use this to send data from any source — including sources Stitch doesn't have a native integration for — into the destination warehouse. Supports both upsert (with primary keys) and append-only (without primary keys) loading.`,
  instructions: [
    'The Import API requires a separate Import API token, generated from the Integration Settings page in Stitch.',
    'The Stitch client ID must be set in the configuration.',
    'Each record is wrapped in a message with an "action" of "upsert" and a "sequence" number for ordering.',
    'If keyNames are provided, records are upserted by primary key. Otherwise, append-only loading is used.'
  ],
  constraints: [
    'Maximum request size: 20 MB.',
    'Maximum 20,000 records per batch.',
    'Maximum 10,000 data points per record.',
    'String key values must be less than 256 characters.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      tableName: z.string().describe('Name of the destination table to load data into'),
      schema: z
        .record(z.string(), z.any())
        .describe(
          'JSON Schema describing the record structure (e.g., {"properties": {"id": {"type": "integer"}, "name": {"type": "string"}}})'
        ),
      records: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of data records to push'),
      keyNames: z
        .array(z.string())
        .optional()
        .describe('Primary key field names for upsert loading. Omit for append-only.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the push operation'),
      message: z.string().nullable().describe('Status message from the API')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.config.clientId) {
      throw new Error(
        'Stitch client ID is required for Import API operations. Set it in the configuration.'
      );
    }

    let client = new StitchImportClient({
      token: ctx.auth.token,
      region: ctx.config.region,
      clientId: ctx.config.clientId
    });

    let now = Date.now();
    let messages = ctx.input.records.map((record, index) => ({
      action: 'upsert' as const,
      sequence: now + index,
      data: record
    }));

    let result = await client.pushBatch({
      table_name: ctx.input.tableName,
      schema: ctx.input.schema,
      messages,
      key_names: ctx.input.keyNames
    });

    return {
      output: {
        status: result?.status || 'ok',
        message: result?.message || null
      },
      message: `Pushed **${ctx.input.records.length}** record(s) to table **${ctx.input.tableName}**.`
    };
  })
  .build();

export let validateData = SlateTool.create(spec, {
  name: 'Validate Data',
  key: 'validate_data',
  description: `Validates data records against the Import API without actually persisting them. Use this to test credentials and verify data format before pushing. Useful for debugging import issues.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tableName: z.string().describe('Name of the destination table'),
      records: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of data records to validate'),
      keyNames: z.array(z.string()).optional().describe('Primary key field names')
    })
  )
  .output(
    z.object({
      valid: z.boolean().describe('Whether the data passed validation'),
      status: z.string().describe('Validation status'),
      message: z.string().nullable().describe('Validation message')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.config.clientId) {
      throw new Error(
        'Stitch client ID is required for Import API operations. Set it in the configuration.'
      );
    }

    let client = new StitchImportClient({
      token: ctx.auth.token,
      region: ctx.config.region,
      clientId: ctx.config.clientId
    });

    let now = Date.now();
    let records = ctx.input.records.map((record, index) => ({
      client_id: Number.parseInt(ctx.config.clientId!, 10),
      table_name: ctx.input.tableName,
      sequence: now + index,
      action: 'upsert' as const,
      key_names: ctx.input.keyNames,
      data: record
    }));

    let result = await client.validatePush(records);

    return {
      output: {
        valid: true,
        status: result?.status || 'ok',
        message: result?.message || null
      },
      message: `Validated **${ctx.input.records.length}** record(s) for table **${ctx.input.tableName}** — all valid.`
    };
  })
  .build();
