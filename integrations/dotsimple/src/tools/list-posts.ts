import { SlateTool } from 'slates';
import { z } from 'zod';
import { DotSimpleClient } from '../lib/client';
import { spec } from '../spec';

export let listPosts = SlateTool.create(spec, {
  name: 'List Posts',
  key: 'list_posts',
  description: `List all social media posts in the workspace with pagination. Returns post summaries including status, accounts, and content previews.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().default(1).describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      posts: z
        .array(
          z.object({
            postId: z.number().optional(),
            postUuid: z.string().optional(),
            status: z.string().optional(),
            scheduledAt: z.string().optional(),
            createdAt: z.string().optional(),
            accounts: z
              .array(
                z.object({
                  accountId: z.number().optional(),
                  name: z.string().optional(),
                  provider: z.string().optional()
                })
              )
              .optional(),
            tags: z
              .array(
                z.object({
                  tagId: z.number().optional(),
                  name: z.string().optional(),
                  hexColor: z.string().optional()
                })
              )
              .optional()
          })
        )
        .describe('Array of posts'),
      currentPage: z.number().optional(),
      total: z.number().optional(),
      perPage: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new DotSimpleClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId
    });

    let result = await client.listPosts(ctx.input.page);
    let posts = (result?.data ?? []).map((p: any) => ({
      postId: p.id,
      postUuid: p.uuid,
      status: p.status,
      scheduledAt: p.scheduled_at,
      createdAt: p.created_at,
      accounts: p.accounts?.map((a: any) => ({
        accountId: a.id,
        name: a.name,
        provider: a.provider
      })),
      tags: p.tags?.map((t: any) => ({
        tagId: t.id,
        name: t.name,
        hexColor: t.hex_color
      }))
    }));

    return {
      output: {
        posts,
        currentPage: result?.meta?.current_page ?? result?.current_page,
        total: result?.meta?.total ?? result?.total,
        perPage: result?.meta?.per_page ?? result?.per_page
      },
      message: `Retrieved **${posts.length}** posts (page ${ctx.input.page}).`
    };
  })
  .build();
