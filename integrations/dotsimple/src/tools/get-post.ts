import { SlateTool } from 'slates';
import { z } from 'zod';
import { DotSimpleClient } from '../lib/client';
import { spec } from '../spec';

export let getPost = SlateTool.create(spec, {
  name: 'Get Post',
  key: 'get_post',
  description: `Retrieve a single post by its UUID, including its content versions, associated accounts, tags, and scheduling details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      postUuid: z.string().describe('UUID of the post to retrieve')
    })
  )
  .output(
    z.object({
      postId: z.number().optional().describe('Numeric ID of the post'),
      postUuid: z.string().optional().describe('UUID of the post'),
      status: z.string().optional().describe('Status of the post (e.g. draft, published)'),
      scheduledAt: z.string().optional().describe('Scheduled publish date/time'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      accounts: z
        .array(
          z.object({
            accountId: z.number().optional(),
            accountUuid: z.string().optional(),
            name: z.string().optional(),
            username: z.string().optional(),
            provider: z.string().optional()
          })
        )
        .optional()
        .describe('Connected social accounts for this post'),
      versions: z
        .array(
          z.object({
            accountId: z.number().optional(),
            isOriginal: z.boolean().optional(),
            content: z
              .array(
                z.object({
                  body: z.string().optional(),
                  url: z.string().optional()
                })
              )
              .optional()
          })
        )
        .optional()
        .describe('Content versions of the post'),
      tags: z
        .array(
          z.object({
            tagId: z.number().optional(),
            tagUuid: z.string().optional(),
            name: z.string().optional(),
            hexColor: z.string().optional()
          })
        )
        .optional()
        .describe('Tags associated with the post')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DotSimpleClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId
    });

    let result = await client.getPost(ctx.input.postUuid);

    return {
      output: {
        postId: result?.id,
        postUuid: result?.uuid,
        status: result?.status,
        scheduledAt: result?.scheduled_at,
        createdAt: result?.created_at,
        accounts: result?.accounts?.map((a: any) => ({
          accountId: a.id,
          accountUuid: a.uuid,
          name: a.name,
          username: a.username,
          provider: a.provider
        })),
        versions: result?.versions?.map((v: any) => ({
          accountId: v.account_id,
          isOriginal: v.is_original,
          content: v.content?.map((c: any) => ({
            body: c.body,
            url: c.url
          }))
        })),
        tags: result?.tags?.map((t: any) => ({
          tagId: t.id,
          tagUuid: t.uuid,
          name: t.name,
          hexColor: t.hex_color
        }))
      },
      message: `Retrieved post \`${result?.uuid ?? ctx.input.postUuid}\` with status **${result?.status ?? 'unknown'}**.`
    };
  })
  .build();
