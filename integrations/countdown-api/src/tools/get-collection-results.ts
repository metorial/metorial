import { SlateTool } from 'slates';
import { z } from 'zod';
import { CountdownClient } from '../lib/client';
import { spec } from '../spec';

export let getCollectionResults = SlateTool.create(spec, {
  name: 'Get Collection Results',
  key: 'get_collection_results',
  description: `Retrieve result sets for a collection, or get a specific result set with download links. Result sets contain the output of completed collection runs and are available for download for 14 days in JSON, JSON Lines, or CSV formats.`,
  instructions: [
    'Provide just `collectionId` to list all result sets for a collection.',
    'Provide both `collectionId` and `resultSetId` to get a specific result set with download links.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      collectionId: z.string().describe('The collection ID to retrieve results for.'),
      resultSetId: z
        .number()
        .optional()
        .describe(
          'Specific result set ID. If omitted, lists all result sets for the collection.'
        )
    })
  )
  .output(
    z.object({
      resultSets: z
        .array(z.any())
        .optional()
        .describe('Array of result set objects (when listing).'),
      resultSet: z
        .any()
        .optional()
        .describe(
          'Single result set object with download links (when getting a specific result set).'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new CountdownClient({ token: ctx.auth.token });

    if (ctx.input.resultSetId !== undefined) {
      let result = await client.getResultSet(ctx.input.collectionId, ctx.input.resultSetId);
      let resultSet = result.result_set || result;

      return {
        output: {
          resultSet
        },
        message: `Retrieved result set **#${ctx.input.resultSetId}** for collection **${ctx.input.collectionId}**.${resultSet.requests_completed ? ` Completed: ${resultSet.requests_completed} requests.` : ''}`
      };
    } else {
      let result = await client.listResultSets(ctx.input.collectionId);
      let resultSets = result.result_sets || [];

      return {
        output: {
          resultSets
        },
        message: `Found **${resultSets.length}** result sets for collection **${ctx.input.collectionId}**.`
      };
    }
  })
  .build();
