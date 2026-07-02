import { SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

export let listChangelogEntriesTool = SlateTool.create(spec, {
  name: 'List Changelog Entries',
  key: 'list_changelog_entries',
  description: `List changelog entries with optional filtering by label or type. Returns published, scheduled, and draft entries with pagination support.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      labelIds: z.array(z.string()).optional().describe('Filter by label IDs'),
      type: z.enum(['new', 'improved', 'fixed']).optional().describe('Filter by change type'),
      sort: z
        .enum(['created', 'lastSaved', 'nonPublishedFirst', 'publishedAt'])
        .optional()
        .describe('Sort order'),
      limit: z.number().optional().describe('Number of entries to return (max 50)'),
      skip: z.number().optional().describe('Number to skip for pagination')
    })
  )
  .output(
    z.object({
      entries: z
        .array(
          z.object({
            entryId: z.string().describe('Entry ID'),
            title: z.string().describe('Entry title'),
            status: z.string().describe('Status (draft, scheduled, published)'),
            types: z.array(z.string()).describe('Change types'),
            publishedAt: z.string().nullable().describe('Publication timestamp'),
            scheduledFor: z.string().nullable().describe('Scheduled publication timestamp'),
            url: z.string().describe('Entry URL'),
            created: z.string().describe('Creation timestamp'),
            markdownDetails: z.string().nullable().describe('Entry body in Markdown'),
            labels: z
              .array(
                z.object({
                  labelId: z.string(),
                  name: z.string()
                })
              )
              .describe('Attached labels')
          })
        )
        .describe('List of changelog entries'),
      hasMore: z.boolean().describe('Whether more entries are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CannyClient(ctx.auth.token);
    let result = await client.listChangelogEntries({
      labelIDs: ctx.input.labelIds,
      type: ctx.input.type,
      sort: ctx.input.sort,
      limit: ctx.input.limit,
      skip: ctx.input.skip
    });

    let entries = (result.entries || []).map((e: any) => ({
      entryId: e.id,
      title: e.title,
      status: e.status,
      types: e.types || [],
      publishedAt: e.publishedAt || null,
      scheduledFor: e.scheduledFor || null,
      url: e.url,
      created: e.created,
      markdownDetails: e.markdownDetails || null,
      labels: (e.labels || []).map((l: any) => ({ labelId: l.id, name: l.name }))
    }));

    return {
      output: { entries, hasMore: result.hasMore },
      message: `Found **${entries.length}** changelog entry(ies)${result.hasMore ? ' (more available)' : ''}.`
    };
  })
  .build();
