import { SlateTool } from 'slates';
import { z } from 'zod';
import { PineconeDataPlaneClient } from '../lib/client';
import { pineconeServiceError } from '../lib/errors';
import { spec } from '../spec';

export let upsertTextRecordsTool = SlateTool.create(spec, {
  name: 'Upsert Text Records',
  key: 'upsert_text_records',
  description: `Upsert text records into a Pinecone integrated-embedding index. Pinecone converts the configured text field to vectors automatically and stores all other fields as metadata.`,
  instructions: [
    'Use only with indexes created with integrated embedding.',
    'Each record must include fields that satisfy the index field map, such as chunk_text for the text input.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      indexHost: z.string().describe('Host URL of the integrated embedding index'),
      namespace: z.string().describe('Namespace to upsert records into'),
      records: z
        .array(
          z.object({
            recordId: z.string().min(1).describe('Unique record ID'),
            fields: z
              .record(z.string(), z.any())
              .describe('Source text and metadata fields for the record')
          })
        )
        .min(1)
        .describe('Text records to upsert')
    })
  )
  .output(
    z.object({
      upsertedCount: z.number().describe('Number of records submitted for upsert'),
      namespace: z.string().describe('Namespace records were upserted into')
    })
  )
  .handleInvocation(async ctx => {
    for (let record of ctx.input.records) {
      if (Object.keys(record.fields).length === 0) {
        throw pineconeServiceError(
          `Record ${record.recordId} must include at least one source text or metadata field.`
        );
      }
    }

    let client = new PineconeDataPlaneClient({
      token: ctx.auth.token,
      indexHost: ctx.input.indexHost
    });

    await client.upsertTextRecords({
      namespace: ctx.input.namespace,
      records: ctx.input.records.map(record => ({
        id: record.recordId,
        fields: record.fields
      }))
    });

    return {
      output: {
        upsertedCount: ctx.input.records.length,
        namespace: ctx.input.namespace
      },
      message: `Submitted **${ctx.input.records.length}** text record${ctx.input.records.length === 1 ? '' : 's'} for upsert into namespace \`${ctx.input.namespace}\`.`
    };
  })
  .build();
