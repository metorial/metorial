import { SlateTool } from 'slates';
import { z } from 'zod';
import { AlgoliaClient } from '../lib/client';
import { spec } from '../spec';

export let indexSettings = SlateTool.create(spec, {
  name: 'Index Settings',
  key: 'index_settings',
  description: `Get or update settings for an Algolia index. Retrieve the full configuration of an index or update settings such as searchable attributes, faceting, custom ranking, replicas, and more.`,
  instructions: [
    'To **get** settings, set action to "get" and provide the indexName.',
    'To **update** settings, set action to "update" and provide the indexName along with a settings object containing the fields to change.',
    'When updating, set forwardToReplicas to true to propagate settings changes to replica indices.',
    'Common settings fields: searchableAttributes, attributesForFaceting, customRanking, ranking, replicas, attributesToRetrieve, attributesToHighlight, attributesToSnippet, unretrievableAttributes, distinct, hitsPerPage, paginationLimitedTo, typoTolerance, allowTyposOnNumericTokens, ignorePlurals, removeStopWords, separatorsToIndex.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['get', 'update'])
        .describe(
          'The action to perform: "get" to retrieve settings, "update" to modify settings'
        ),
      indexName: z.string().describe('Name of the Algolia index'),
      settings: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Settings object with fields to update (required for update action). Supports any valid Algolia index setting such as searchableAttributes, attributesForFaceting, customRanking, ranking, replicas, etc.'
        ),
      forwardToReplicas: z
        .boolean()
        .optional()
        .describe(
          'Whether to forward settings changes to replica indices (only for update action)'
        )
    })
  )
  .output(z.any())
  .handleInvocation(async ctx => {
    let client = new AlgoliaClient({
      applicationId: ctx.auth.applicationId,
      token: ctx.auth.token,
      analyticsRegion: ctx.config.analyticsRegion
    });

    let { action, indexName } = ctx.input;

    if (action === 'get') {
      let settings = await client.getSettings(indexName);

      return {
        output: settings,
        message: `Retrieved settings for index **${indexName}**`
      };
    }

    // action === 'update'
    if (!ctx.input.settings || Object.keys(ctx.input.settings).length === 0) {
      throw new Error(
        'Settings object is required and must not be empty when updating index settings.'
      );
    }

    let result = await client.setSettings(
      indexName,
      ctx.input.settings,
      ctx.input.forwardToReplicas
    );

    return {
      output: result,
      message: `Updated settings for index **${indexName}**${ctx.input.forwardToReplicas ? ' (forwarded to replicas)' : ''}`
    };
  })
  .build();
