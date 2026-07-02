import { SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

export let createChangelogEntryTool = SlateTool.create(spec, {
  name: 'Create Changelog Entry',
  key: 'create_changelog_entry',
  description: `Create a new changelog entry. Entries can be published immediately, scheduled for future publication, or saved as drafts. Supports types (new, improved, fixed), labels, and linking to feedback posts.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Title of the changelog entry'),
      details: z.string().describe('Body content of the entry (supports Markdown)'),
      type: z.enum(['new', 'improved', 'fixed']).optional().describe('Type of change'),
      notify: z.boolean().optional().describe('Whether to send notifications to users'),
      published: z
        .boolean()
        .optional()
        .describe('Whether to publish immediately (false = draft)'),
      publishedOn: z.string().optional().describe('Backdate the publication date (ISO 8601)'),
      scheduledFor: z
        .string()
        .optional()
        .describe('Schedule for future publication (ISO 8601)'),
      labelIds: z.array(z.string()).optional().describe('Label IDs to attach'),
      postIds: z.array(z.string()).optional().describe('Post IDs to link to this entry')
    })
  )
  .output(
    z.object({
      entryId: z.string().describe('ID of the created changelog entry')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CannyClient(ctx.auth.token);
    let result = await client.createChangelogEntry({
      title: ctx.input.title,
      details: ctx.input.details,
      type: ctx.input.type,
      notify: ctx.input.notify,
      published: ctx.input.published,
      publishedOn: ctx.input.publishedOn,
      scheduledFor: ctx.input.scheduledFor,
      labelIDs: ctx.input.labelIds,
      postIDs: ctx.input.postIds
    });

    return {
      output: { entryId: result.id },
      message: `Created changelog entry **"${ctx.input.title}"**.`
    };
  })
  .build();
