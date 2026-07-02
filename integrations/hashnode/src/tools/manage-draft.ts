import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageDraft = SlateTool.create(spec, {
  name: 'Manage Draft',
  key: 'manage_draft',
  description: `Create, retrieve, list, or publish drafts. Use **action** to specify the operation:
- **create**: Create a new draft with Markdown content and optional metadata.
- **get**: Retrieve a single draft by its ID.
- **list**: List all drafts in the publication with pagination.
- **publish**: Publish an existing draft as a live blog post.`,
  instructions: ['Only the publication owner can access drafts.']
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'list', 'publish'])
        .describe('The operation to perform'),
      draftId: z
        .string()
        .optional()
        .describe('Draft ID — required for "get" and "publish" actions'),
      title: z.string().optional().describe('Draft title — required for "create"'),
      contentMarkdown: z
        .string()
        .optional()
        .describe('Draft content in Markdown — required for "create"'),
      subtitle: z.string().optional().describe('Draft subtitle — used with "create"'),
      slug: z.string().optional().describe('Custom URL slug — used with "create"'),
      tags: z
        .array(
          z.object({
            tagId: z.string().optional(),
            name: z.string().optional(),
            slug: z.string().optional()
          })
        )
        .optional()
        .describe('Tags — used with "create"'),
      coverImageUrl: z.string().optional().describe('Cover image URL — used with "create"'),
      first: z
        .number()
        .optional()
        .default(10)
        .describe('Number of drafts to list — used with "list"'),
      after: z.string().optional().describe('Pagination cursor — used with "list"')
    })
  )
  .output(
    z.object({
      draft: z
        .object({
          draftId: z.string().describe('Draft ID'),
          title: z.string().nullable().optional().describe('Draft title'),
          slug: z.string().nullable().optional().describe('Draft slug'),
          updatedAt: z.string().nullable().optional().describe('Last updated timestamp'),
          contentMarkdown: z
            .string()
            .nullable()
            .optional()
            .describe('Draft content in Markdown'),
          authorUsername: z.string().nullable().optional().describe('Author username'),
          tags: z
            .array(
              z.object({
                tagId: z.string(),
                name: z.string(),
                slug: z.string()
              })
            )
            .optional()
            .describe('Tags')
        })
        .nullable()
        .optional()
        .describe('Single draft — returned by "create", "get"'),
      drafts: z
        .array(
          z.object({
            draftId: z.string(),
            title: z.string().nullable().optional(),
            slug: z.string().nullable().optional(),
            updatedAt: z.string().nullable().optional(),
            authorUsername: z.string().nullable().optional()
          })
        )
        .nullable()
        .optional()
        .describe('List of drafts — returned by "list"'),
      publishedPost: z
        .object({
          postId: z.string(),
          title: z.string(),
          slug: z.string(),
          url: z.string()
        })
        .nullable()
        .optional()
        .describe('Published post — returned by "publish"'),
      hasNextPage: z.boolean().optional().describe('Whether more drafts are available'),
      endCursor: z.string().nullable().optional().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      publicationHost: ctx.config.publicationHost
    });

    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.title || !ctx.input.contentMarkdown) {
        throw new Error('title and contentMarkdown are required to create a draft');
      }

      let tags = ctx.input.tags?.map(t => ({ id: t.tagId, name: t.name, slug: t.slug }));
      let draft = await client.createDraft({
        title: ctx.input.title,
        contentMarkdown: ctx.input.contentMarkdown,
        subtitle: ctx.input.subtitle,
        slug: ctx.input.slug,
        tags,
        coverImageURL: ctx.input.coverImageUrl
      });

      return {
        output: {
          draft: {
            draftId: draft.id,
            title: draft.title,
            slug: draft.slug
          }
        },
        message: `Created draft **"${draft.title}"**`
      };
    }

    if (action === 'get') {
      if (!ctx.input.draftId) {
        throw new Error('draftId is required to get a draft');
      }

      let draft = await client.getDraft(ctx.input.draftId);
      if (!draft) throw new Error('Draft not found');

      return {
        output: {
          draft: {
            draftId: draft.id,
            title: draft.title,
            slug: draft.slug,
            updatedAt: draft.updatedAt,
            contentMarkdown: draft.content?.markdown,
            authorUsername: draft.author?.username,
            tags: (draft.tags || []).map((t: any) => ({
              tagId: t.id,
              name: t.name,
              slug: t.slug
            }))
          }
        },
        message: `Retrieved draft **"${draft.title}"**`
      };
    }

    if (action === 'list') {
      let result = await client.listDrafts({
        first: Math.min(ctx.input.first, 20),
        after: ctx.input.after
      });

      let drafts = result.drafts.map((d: any) => ({
        draftId: d.id,
        title: d.title,
        slug: d.slug,
        updatedAt: d.updatedAt,
        authorUsername: d.author?.username
      }));

      return {
        output: {
          drafts,
          hasNextPage: result.pageInfo?.hasNextPage ?? false,
          endCursor: result.pageInfo?.endCursor
        },
        message: `Found **${drafts.length}** drafts`
      };
    }

    if (action === 'publish') {
      if (!ctx.input.draftId) {
        throw new Error('draftId is required to publish a draft');
      }

      let post = await client.publishDraft(ctx.input.draftId);

      return {
        output: {
          publishedPost: {
            postId: post.id,
            title: post.title,
            slug: post.slug,
            url: post.url
          }
        },
        message: `Published draft as **"${post.title}"** at ${post.url}`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
