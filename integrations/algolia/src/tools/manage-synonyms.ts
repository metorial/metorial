import { SlateTool } from 'slates';
import { z } from 'zod';
import { AlgoliaClient } from '../lib/client';
import { spec } from '../spec';

export let manageSynonyms = SlateTool.create(spec, {
  name: 'Manage Synonyms',
  key: 'manage_synonyms',
  description: `Manage synonyms on an Algolia index. Supports getting, searching, saving, batch saving, deleting, and clearing synonyms. Synonyms improve search relevance by mapping alternative words or phrases to each other.`,
  instructions: [
    'Use "get" to retrieve a single synonym by its ID',
    'Use "search" to find synonyms, optionally filtered by type',
    'Use "save" to create or update a single synonym — synonymId and synonym object are required',
    'Use "saveBatch" to create or update multiple synonyms at once',
    'Use "delete" to remove a single synonym by its ID',
    'Use "clear" to remove all synonyms from an index',
    'Set forwardToReplicas to true to propagate changes to replica indices',
    'Synonym types: synonym (multi-way), oneWaySynonym, altCorrection1, altCorrection2, placeholder'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['get', 'search', 'save', 'saveBatch', 'delete', 'clear'])
        .describe('Action to perform on synonyms'),
      indexName: z.string().describe('Name of the Algolia index'),
      synonymId: z
        .string()
        .optional()
        .describe('Synonym object ID — required for get, save, and delete actions'),
      synonym: z
        .object({
          type: z
            .enum([
              'synonym',
              'oneWaySynonym',
              'altCorrection1',
              'altCorrection2',
              'placeholder'
            ])
            .describe('Type of synonym'),
          synonyms: z
            .array(z.string())
            .optional()
            .describe('List of synonyms (for "synonym" type)'),
          input: z.string().optional().describe('Input word (for "oneWaySynonym" type)'),
          word: z
            .string()
            .optional()
            .describe(
              'Word to apply corrections to (for "altCorrection1"/"altCorrection2" types)'
            ),
          corrections: z
            .array(z.string())
            .optional()
            .describe('List of corrections (for "altCorrection1"/"altCorrection2" types)'),
          placeholder: z
            .string()
            .optional()
            .describe('Placeholder token (for "placeholder" type)'),
          replacements: z
            .array(z.string())
            .optional()
            .describe('Replacement values (for "placeholder" type)')
        })
        .optional()
        .describe('Synonym definition — required for save action'),
      synonyms: z
        .array(
          z.object({
            objectID: z.string().describe('Unique identifier for this synonym'),
            type: z
              .enum([
                'synonym',
                'oneWaySynonym',
                'altCorrection1',
                'altCorrection2',
                'placeholder'
              ])
              .describe('Type of synonym'),
            synonyms: z
              .array(z.string())
              .optional()
              .describe('List of synonyms (for "synonym" type)'),
            input: z.string().optional().describe('Input word (for "oneWaySynonym" type)'),
            word: z
              .string()
              .optional()
              .describe(
                'Word to apply corrections to (for "altCorrection1"/"altCorrection2" types)'
              ),
            corrections: z
              .array(z.string())
              .optional()
              .describe('List of corrections (for "altCorrection1"/"altCorrection2" types)'),
            placeholder: z
              .string()
              .optional()
              .describe('Placeholder token (for "placeholder" type)'),
            replacements: z
              .array(z.string())
              .optional()
              .describe('Replacement values (for "placeholder" type)')
          })
        )
        .optional()
        .describe('Array of synonym definitions — required for saveBatch action'),
      searchQuery: z
        .string()
        .optional()
        .describe('Search query to filter synonyms — used with search action'),
      synonymType: z
        .enum(['synonym', 'oneWaySynonym', 'altCorrection1', 'altCorrection2', 'placeholder'])
        .optional()
        .describe('Filter synonyms by type — used with search action'),
      forwardToReplicas: z
        .boolean()
        .optional()
        .describe('Whether to forward changes to replica indices'),
      replaceExistingSynonyms: z
        .boolean()
        .optional()
        .describe('Whether to replace all existing synonyms — used with saveBatch action')
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
      if (!ctx.input.synonymId) {
        throw new Error('synonymId is required for get action');
      }
      let result = await client.getSynonym(indexName, ctx.input.synonymId);
      return {
        output: result,
        message: `Retrieved synonym \`${ctx.input.synonymId}\` from index \`${indexName}\`.`
      };
    }

    if (action === 'search') {
      let params: Record<string, any> = {};
      if (ctx.input.searchQuery !== undefined) params.query = ctx.input.searchQuery;
      if (ctx.input.synonymType !== undefined) params.type = ctx.input.synonymType;
      let result = await client.searchSynonyms(indexName, params);
      let count = result.hits?.length ?? result.nbHits ?? 0;
      return {
        output: result,
        message: `Found **${count}** synonym(s) in index \`${indexName}\`.`
      };
    }

    if (action === 'save') {
      if (!ctx.input.synonymId) {
        throw new Error('synonymId is required for save action');
      }
      if (!ctx.input.synonym) {
        throw new Error('synonym object is required for save action');
      }
      let result = await client.saveSynonym(
        indexName,
        ctx.input.synonymId,
        ctx.input.synonym,
        ctx.input.forwardToReplicas
      );
      return {
        output: result,
        message: `Saved synonym \`${ctx.input.synonymId}\` to index \`${indexName}\`.`
      };
    }

    if (action === 'saveBatch') {
      if (!ctx.input.synonyms || ctx.input.synonyms.length === 0) {
        throw new Error('synonyms array is required for saveBatch action');
      }
      let result = await client.saveSynonyms(
        indexName,
        ctx.input.synonyms,
        ctx.input.forwardToReplicas,
        ctx.input.replaceExistingSynonyms
      );
      return {
        output: result,
        message: `Saved **${ctx.input.synonyms.length}** synonym(s) to index \`${indexName}\`.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.synonymId) {
        throw new Error('synonymId is required for delete action');
      }
      let result = await client.deleteSynonym(
        indexName,
        ctx.input.synonymId,
        ctx.input.forwardToReplicas
      );
      return {
        output: result,
        message: `Deleted synonym \`${ctx.input.synonymId}\` from index \`${indexName}\`.`
      };
    }

    // clear
    let result = await client.clearSynonyms(indexName, ctx.input.forwardToReplicas);
    return {
      output: result,
      message: `Cleared all synonyms from index \`${indexName}\`.`
    };
  })
  .build();
