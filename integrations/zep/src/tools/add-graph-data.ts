import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addGraphData = SlateTool.create(spec, {
  name: 'Add Graph Data',
  key: 'add_graph_data',
  description:
    'Ingest business data, documents, or other text into a user or standalone knowledge graph. Zep returns an episode that is processed asynchronously into entities and facts.',
  instructions: [
    'Provide exactly one of userId or graphId.',
    'For JSON data, provide a serialized JSON string and set dataType to json.',
    'Save the episode UUID to inspect or delete the ingested data later. Newly submitted data may not be immediately searchable.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      data: z
        .string()
        .min(1)
        .max(10000)
        .describe('Content to ingest, up to 10,000 characters'),
      dataType: z.enum(['text', 'json', 'message']).describe('Format of the ingested content'),
      userId: z
        .string()
        .optional()
        .describe(
          'User ID whose graph should receive the data; call list_users to discover users'
        ),
      graphId: z
        .string()
        .optional()
        .describe('Standalone graph ID whose graph should receive the data'),
      createdAt: z.string().optional().describe('Original event timestamp in ISO 8601 format'),
      sourceDescription: z
        .string()
        .max(500)
        .optional()
        .describe('Description of the data source, up to 500 characters'),
      documentId: z
        .string()
        .min(1)
        .max(100)
        .optional()
        .describe('Group chunks of the same document under this identifier'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Episode metadata, up to ten keys with scalar values or arrays of scalars'),
      strictOntology: z
        .boolean()
        .optional()
        .describe('Only extract entities matching the configured ontology')
    })
  )
  .output(
    z.object({
      episodeUuid: z.string().describe('UUID of the ingested episode'),
      content: z.string().describe('Episode content stored by Zep'),
      createdAt: z.string().optional().describe('Episode timestamp'),
      processed: z.boolean().optional().describe('Whether graph processing has completed'),
      taskId: z.string().optional().describe('Processing task ID, when returned'),
      source: z.string().optional().describe('Episode content type'),
      sourceDescription: z.string().optional().describe('Description of the source'),
      documentId: z.string().optional().describe('Document grouping identifier'),
      metadata: z.record(z.string(), z.unknown()).optional().describe('Episode metadata')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.dataType === 'json') {
      try {
        JSON.parse(ctx.input.data);
      } catch {
        throw createApiServiceError('data must contain valid JSON when dataType is json.');
      }
    }
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let episode = await client.addGraphData({
      ...ctx.input,
      type: ctx.input.dataType
    });
    return {
      output: {
        episodeUuid: episode.uuid,
        content: episode.content,
        createdAt: episode.created_at,
        processed: episode.processed,
        taskId: episode.task_id,
        source: episode.source,
        sourceDescription: episode.source_description,
        documentId: episode.document_id,
        metadata: episode.metadata
      },
      message: `Submitted episode **${episode.uuid}** for graph processing.`
    };
  })
  .build();
