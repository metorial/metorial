import { SlateTool } from 'slates';
import { z } from 'zod';
import { AlgoliaClient } from '../lib/client';
import { spec } from '../spec';

export let manageIndices = SlateTool.create(spec, {
  name: 'Manage Indices',
  key: 'manage_indices',
  description: `List, delete, copy, or move Algolia indices. Browse all indices in your application, remove an index permanently, duplicate an index (optionally scoping to settings, synonyms, or rules only), or rename/move an index to a new destination.`,
  instructions: [
    'To **list** indices, set action to "list". Optionally provide page and hitsPerPage for pagination.',
    'To **delete** an index, set action to "delete" and provide the indexName. This permanently removes the index and all its data.',
    'To **copy** an index, set action to "copy" and provide indexName (source) and destinationIndexName. Optionally provide copyScope to limit what is copied (e.g., only settings, synonyms, or rules).',
    'To **move** an index, set action to "move" and provide indexName (source) and destinationIndexName. This renames the source index; the original name will no longer exist.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'delete', 'copy', 'move'])
        .describe('The index management action to perform'),
      indexName: z
        .string()
        .optional()
        .describe('Name of the source index (required for delete, copy, and move)'),
      destinationIndexName: z
        .string()
        .optional()
        .describe('Name of the destination index (required for copy and move)'),
      copyScope: z
        .array(z.enum(['settings', 'synonyms', 'rules']))
        .optional()
        .describe(
          'Scope of the copy operation. When omitted, the entire index (records, settings, synonyms, rules) is copied. Provide one or more of "settings", "synonyms", "rules" to copy only those parts.'
        ),
      page: z.number().optional().describe('Page number for listing indices (zero-based)'),
      hitsPerPage: z
        .number()
        .optional()
        .describe('Number of indices to return per page when listing')
    })
  )
  .output(z.any())
  .handleInvocation(async ctx => {
    let client = new AlgoliaClient({
      applicationId: ctx.auth.applicationId,
      token: ctx.auth.token,
      analyticsRegion: ctx.config.analyticsRegion
    });

    let { action, indexName, destinationIndexName, copyScope, page, hitsPerPage } = ctx.input;

    if (action === 'list') {
      let result = await client.listIndices(page, hitsPerPage);
      let count = result.items?.length ?? 0;

      return {
        output: result,
        message: `Retrieved **${count}** indices${page !== undefined ? ` (page ${page})` : ''}.`
      };
    }

    if (!indexName) {
      throw new Error('indexName is required for delete, copy, and move actions.');
    }

    if (action === 'delete') {
      let result = await client.deleteIndex(indexName);

      return {
        output: result,
        message: `Deleted index **${indexName}**.`
      };
    }

    if (!destinationIndexName) {
      throw new Error('destinationIndexName is required for copy and move actions.');
    }

    if (action === 'copy') {
      let result = await client.copyIndex(indexName, destinationIndexName, copyScope);
      let scopeLabel =
        copyScope && copyScope.length > 0 ? ` (scope: ${copyScope.join(', ')})` : '';

      return {
        output: result,
        message: `Copied index **${indexName}** to **${destinationIndexName}**${scopeLabel}.`
      };
    }

    // action === 'move'
    let result = await client.moveIndex(indexName, destinationIndexName);

    return {
      output: result,
      message: `Moved index **${indexName}** to **${destinationIndexName}**.`
    };
  })
  .build();
