import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createRecords = SlateTool.create(spec, {
  name: 'Create Records',
  key: 'create_records',
  description: `Create one or more new records in a table. Field values should use field names (not IDs) as keys. Use **Get Table Schema** to discover available fields.`,
  instructions: [
    'Each record in the array should contain a "fields" object mapping field names to values.',
    'Use the appropriate value types: strings for text, numbers for numeric fields, booleans for checkboxes, etc.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      teamId: z.string().describe('ID of the team'),
      databaseId: z.string().describe('ID of the database'),
      tableId: z.string().describe('ID of the table (e.g. "A", "B")'),
      records: z
        .array(
          z.object({
            fields: z
              .record(z.string(), z.any())
              .describe('Field values for the new record, keyed by field name')
          })
        )
        .min(1)
        .describe('Array of records to create')
    })
  )
  .output(
    z.object({
      createdRecords: z
        .array(
          z.object({
            recordId: z.number().describe('ID of the created record'),
            fields: z
              .record(z.string(), z.any())
              .describe('Field values of the created record')
          })
        )
        .describe('Created records with their assigned IDs'),
      count: z.number().describe('Number of records created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let created = await client.createRecords(
      ctx.input.teamId,
      ctx.input.databaseId,
      ctx.input.tableId,
      ctx.input.records
    );

    return {
      output: {
        createdRecords: created.map(r => ({
          recordId: r.id,
          fields: r.fields
        })),
        count: created.length
      },
      message: `Created **${created.length}** record(s) in table **${ctx.input.tableId}**.`
    };
  })
  .build();
