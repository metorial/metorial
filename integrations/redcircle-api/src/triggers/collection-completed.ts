import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let collectionCompleted = SlateTrigger.create(spec, {
  name: 'Collection Completed',
  key: 'collection_completed',
  description:
    'Fires when a RedCircle API collection finishes executing and a new result set is available for download. Configure the webhook URL on your collection or account profile to receive these notifications.'
})
  .input(
    z.object({
      collectionId: z.string().describe('ID of the collection that completed.'),
      collectionName: z.string().describe('Name of the collection.'),
      resultSetId: z.number().describe('ID of the new result set.'),
      downloadLinks: z
        .any()
        .optional()
        .describe('Download links for the result set (JSON, CSV, etc).'),
      rawPayload: z.any().describe('Full raw webhook payload from RedCircle API.')
    })
  )
  .output(
    z.object({
      collectionId: z.string().describe('ID of the collection that completed.'),
      collectionName: z.string().describe('Name of the completed collection.'),
      resultSetId: z.number().describe('ID of the new result set ready for download.'),
      downloadLinks: z
        .any()
        .optional()
        .describe('Download links for JSON, CSV, and other formats.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      // Validate that this is a collection completion webhook
      let requestType = data?.request_info?.type;
      if (requestType !== 'collection_resultset_completed') {
        return { inputs: [] };
      }

      let collection = (data?.collection ?? {}) as Record<string, any>;
      let resultSet = (data?.result_set ?? {}) as Record<string, any>;

      return {
        inputs: [
          {
            collectionId: String(collection.id ?? ''),
            collectionName: String(collection.name ?? ''),
            resultSetId: resultSet.id ?? 0,
            downloadLinks: resultSet.download_links,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'collection.completed',
        id: `${ctx.input.collectionId}-${ctx.input.resultSetId}`,
        output: {
          collectionId: ctx.input.collectionId,
          collectionName: ctx.input.collectionName,
          resultSetId: ctx.input.resultSetId,
          downloadLinks: ctx.input.downloadLinks
        }
      };
    }
  })
  .build();
