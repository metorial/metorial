import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getContentVersions = SlateTool.create(spec, {
  name: 'Get Content Versions',
  key: 'get_content_versions',
  description: `Retrieve the version history of a Confluence page or blog post. Shows who made changes, when, and their version messages.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      contentId: z.string().describe('The content ID (page, blog post, or attachment)'),
      contentType: z
        .enum(['page', 'blogpost', 'attachment'])
        .optional()
        .default('page')
        .describe('The type of content whose versions should be retrieved'),
      limit: z
        .number()
        .optional()
        .default(10)
        .describe('Maximum number of versions to return'),
      cursor: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      versions: z.array(
        z.object({
          versionNumber: z.number(),
          message: z.string().optional(),
          when: z.string().optional(),
          authorDisplayName: z.string().optional(),
          authorAccountId: z.string().optional(),
          minorEdit: z.boolean().optional()
        })
      ),
      nextCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let response = await client.getContentVersions(ctx.input.contentId, {
      contentType: ctx.input.contentType,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let versions = response.results.map((v: any) => ({
      versionNumber: v.number,
      message: v.message,
      when: v.when,
      authorDisplayName: v.by?.displayName,
      authorAccountId: v.by?.accountId || v.authorId,
      minorEdit: v.minorEdit
    }));

    let nextLink = response._links?.next;
    let nextCursor: string | undefined;
    if (nextLink) {
      let match = nextLink.match(/cursor=([^&]+)/);
      if (match) nextCursor = decodeURIComponent(match[1]!);
    }

    return {
      output: { versions, nextCursor },
      message: `Found **${versions.length}** versions for ${ctx.input.contentType} ${ctx.input.contentId}`
    };
  })
  .build();
