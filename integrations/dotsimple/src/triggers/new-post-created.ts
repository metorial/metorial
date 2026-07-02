import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { DotSimpleClient } from '../lib/client';
import { spec } from '../spec';

export let newPostCreated = SlateTrigger.create(spec, {
  name: 'New Post Created',
  key: 'new_post_created',
  description: 'Triggers when a new post is created in the workspace.'
})
  .input(
    z.object({
      postUuid: z.string().describe('UUID of the new post'),
      postId: z.number().optional().describe('Numeric ID of the new post'),
      status: z.string().optional().describe('Status of the post'),
      createdAt: z.string().optional().describe('Creation timestamp'),
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
            name: z.string().optional()
          })
        )
        .optional()
    })
  )
  .output(
    z.object({
      postUuid: z.string().describe('UUID of the new post'),
      postId: z.number().optional().describe('Numeric ID of the new post'),
      status: z.string().optional().describe('Status of the post (e.g. draft, published)'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      accounts: z
        .array(
          z.object({
            accountId: z.number().optional(),
            name: z.string().optional(),
            provider: z.string().optional()
          })
        )
        .optional()
        .describe('Social accounts the post targets'),
      tags: z
        .array(
          z.object({
            tagId: z.number().optional(),
            name: z.string().optional()
          })
        )
        .optional()
        .describe('Tags associated with the post')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new DotSimpleClient({
        token: ctx.auth.token,
        workspaceId: ctx.config.workspaceId
      });

      let state = ctx.state as { knownUuids?: string[] } | null;
      let knownUuids = new Set(state?.knownUuids ?? []);

      let result = await client.listPosts(1);
      let posts: any[] = result?.data ?? [];

      let newPosts = posts.filter((p: any) => !knownUuids.has(p.uuid));

      let allUuids = posts.map((p: any) => p.uuid as string);

      return {
        inputs: newPosts.map((p: any) => ({
          postUuid: p.uuid,
          postId: p.id,
          status: p.status,
          createdAt: p.created_at,
          accounts: p.accounts?.map((a: any) => ({
            accountId: a.id,
            name: a.name,
            provider: a.provider
          })),
          tags: p.tags?.map((t: any) => ({
            tagId: t.id,
            name: t.name
          }))
        })),
        updatedState: {
          knownUuids: allUuids
        }
      };
    },
    handleEvent: async ctx => {
      return {
        type: 'post.created',
        id: ctx.input.postUuid,
        output: {
          postUuid: ctx.input.postUuid,
          postId: ctx.input.postId,
          status: ctx.input.status,
          createdAt: ctx.input.createdAt,
          accounts: ctx.input.accounts,
          tags: ctx.input.tags
        }
      };
    }
  })
  .build();
