import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContent = SlateTool.create(spec, {
  name: 'List Content',
  key: 'list_content',
  description: `Lists all content objects (flows, checklists, and launchers) in the account. Can expand draft and published versions to include the actual content details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of content items to return'),
      startingAfter: z.string().optional().describe('Cursor for pagination'),
      expand: z
        .array(z.string())
        .optional()
        .describe('Related objects to expand (e.g. draft_version, published_version)')
    })
  )
  .output(
    z.object({
      content: z
        .array(
          z.object({
            contentId: z.string().describe('ID of the content'),
            name: z.string().describe('Name of the content'),
            type: z.enum(['flow', 'checklist', 'launcher']).describe('Type of content'),
            draftVersionId: z.string().nullable().describe('ID of the draft version'),
            publishedVersionId: z.string().nullable().describe('ID of the published version'),
            createdAt: z.string().describe('Timestamp when the content was created')
          })
        )
        .describe('List of content items'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.listContent({
      limit: ctx.input.limit,
      startingAfter: ctx.input.startingAfter,
      expand: ctx.input.expand
    });

    let content = result.data.map(c => ({
      contentId: c.id,
      name: c.name,
      type: c.type,
      draftVersionId: c.draft_version_id,
      publishedVersionId: c.published_version_id,
      createdAt: c.created_at
    }));

    return {
      output: {
        content,
        hasMore: result.has_more
      },
      message: `Retrieved **${content.length}** content item(s).`
    };
  })
  .build();
