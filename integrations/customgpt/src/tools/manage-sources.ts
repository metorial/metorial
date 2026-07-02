import { SlateTool } from 'slates';
import { z } from 'zod';
import { CustomGPTClient } from '../lib/client';
import { spec } from '../spec';

export let manageSources = SlateTool.create(spec, {
  name: 'Manage Sources',
  key: 'manage_sources',
  description: `Add, list, delete, or sync data sources that power an agent's knowledge base. Sources can include sitemaps, URLs, helpdesks, and more. Syncing refreshes the source data.`,
  instructions: [
    'Use action "list" to see all sources for an agent.',
    'Use action "add" to add a new source — provide sourceType and sourceUrl.',
    'Use action "delete" to remove a source by its ID.',
    'Use action "sync" to trigger an immediate re-sync of a source.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'add', 'delete', 'sync']).describe('Action to perform'),
      projectId: z.number().describe('ID of the agent'),
      sourceId: z.number().optional().describe('Source ID (required for delete, sync)'),
      sourceType: z
        .string()
        .optional()
        .describe('Type of source to add (e.g. "sitemap", "url", "file")'),
      sourceName: z.string().optional().describe('Name for the source'),
      sourceUrl: z
        .string()
        .optional()
        .describe('URL for the source (required when adding sitemap or URL sources)'),
      isOcrEnabled: z.boolean().optional().describe('Enable OCR for this source'),
      isVisionEnabled: z.boolean().optional().describe('Enable vision processing for images')
    })
  )
  .output(
    z.object({
      sources: z
        .array(
          z.object({
            sourceId: z.number().describe('Source ID'),
            sourceName: z.string().describe('Source name'),
            sourceType: z.string().describe('Source type'),
            sourceUrl: z.string().nullable().describe('Source URL'),
            crawlStatus: z.string().describe('Crawl status'),
            indexStatus: z.string().describe('Index status'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of sources (for list action)'),
      addedSource: z
        .object({
          sourceId: z.number().describe('Source ID'),
          sourceName: z.string().describe('Source name'),
          sourceType: z.string().describe('Source type')
        })
        .optional()
        .describe('Newly added source (for add action)'),
      deleted: z.boolean().optional().describe('Whether the source was deleted'),
      synced: z.boolean().optional().describe('Whether sync was triggered')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CustomGPTClient({ token: ctx.auth.token });
    let { action, projectId } = ctx.input;

    if (action === 'list') {
      let sources = await client.listSources(projectId);
      return {
        output: {
          sources: sources.map(s => ({
            sourceId: s.sourceId,
            sourceName: s.sourceName,
            sourceType: s.sourceType,
            sourceUrl: s.sourceUrl,
            crawlStatus: s.crawlStatus,
            indexStatus: s.indexStatus,
            createdAt: s.createdAt
          }))
        },
        message: `Found **${sources.length}** source(s) for agent **${projectId}**.`
      };
    }

    if (action === 'add') {
      if (!ctx.input.sourceType) {
        throw new Error('sourceType is required when adding a source');
      }
      let source = await client.addSource(projectId, {
        sourceType: ctx.input.sourceType,
        sourceName: ctx.input.sourceName,
        sourceUrl: ctx.input.sourceUrl,
        isOcrEnabled: ctx.input.isOcrEnabled,
        isVisionEnabled: ctx.input.isVisionEnabled
      });
      return {
        output: {
          addedSource: {
            sourceId: source.sourceId,
            sourceName: source.sourceName,
            sourceType: source.sourceType
          }
        },
        message: `Added source **${source.sourceName}** (ID: ${source.sourceId}) to agent **${projectId}**.`
      };
    }

    if (!ctx.input.sourceId) {
      throw new Error('sourceId is required for delete and sync actions');
    }

    if (action === 'delete') {
      await client.deleteSource(projectId, ctx.input.sourceId);
      return {
        output: { deleted: true },
        message: `Deleted source **${ctx.input.sourceId}** from agent **${projectId}**.`
      };
    }

    // sync
    await client.syncSource(projectId, ctx.input.sourceId);
    return {
      output: { synced: true },
      message: `Triggered sync for source **${ctx.input.sourceId}** on agent **${projectId}**.`
    };
  })
  .build();
