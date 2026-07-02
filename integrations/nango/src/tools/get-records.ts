import { SlateTool } from 'slates';
import { z } from 'zod';
import { NangoClient } from '../lib/client';
import { spec } from '../spec';

export let getRecords = SlateTool.create(spec, {
  name: 'Get Records',
  key: 'get_records',
  description: `Retrieve synced records from Nango's cache for a specific connection and data model. Records are ordered by modification date ascending. Supports cursor-based pagination and filtering by modification time or record IDs.`,
  instructions: [
    'Use the cursor from the response to paginate through large result sets.',
    'Use modifiedAfter to fetch only records that changed since a specific time.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      connectionId: z.string().describe('The connection ID to fetch records for'),
      providerConfigKey: z.string().describe('The integration ID (unique key)'),
      model: z.string().describe('The data model name to query'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      modifiedAfter: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp to filter records modified after this time'),
      recordIds: z
        .array(z.string())
        .optional()
        .describe('Filter to only include records with these IDs'),
      limit: z.number().optional().describe('Maximum number of records to return')
    })
  )
  .output(
    z.object({
      records: z.array(
        z.object({
          fields: z.record(z.string(), z.any()).describe('Record data fields'),
          nangoMetadata: z.object({
            deletedAt: z.string().nullable(),
            lastAction: z.string(),
            firstSeenAt: z.string(),
            lastModifiedAt: z.string(),
            cursor: z.string()
          })
        })
      ),
      nextCursor: z
        .string()
        .optional()
        .describe('Cursor for fetching the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NangoClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.getRecords({
      connectionId: ctx.input.connectionId,
      providerConfigKey: ctx.input.providerConfigKey,
      model: ctx.input.model,
      cursor: ctx.input.cursor,
      modifiedAfter: ctx.input.modifiedAfter,
      ids: ctx.input.recordIds,
      limit: ctx.input.limit
    });

    let records = result.records.map(r => {
      let { _nango_metadata, ...fields } = r;
      return {
        fields,
        nangoMetadata: {
          deletedAt: _nango_metadata.deleted_at,
          lastAction: _nango_metadata.last_action,
          firstSeenAt: _nango_metadata.first_seen_at,
          lastModifiedAt: _nango_metadata.last_modified_at,
          cursor: _nango_metadata.cursor
        }
      };
    });

    return {
      output: {
        records,
        nextCursor: result.next_cursor
      },
      message: `Retrieved **${records.length}** record(s) for model **${ctx.input.model}** from connection **${ctx.input.connectionId}**.${result.next_cursor ? ' More records available via cursor.' : ''}`
    };
  })
  .build();
