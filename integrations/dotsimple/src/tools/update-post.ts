import { SlateTool } from 'slates';
import { z } from 'zod';
import { DotSimpleClient } from '../lib/client';
import { spec } from '../spec';

let contentSchema = z.object({
  body: z.string().describe('The text content of the post'),
  url: z.string().optional().describe('A URL to include in the post'),
  media: z.array(z.number()).optional().describe('Array of media file IDs to attach')
});

let versionSchema = z.object({
  accountId: z.number().describe('The account ID this version targets'),
  isOriginal: z.boolean().default(true).describe('Whether this is the original version'),
  content: z.array(contentSchema).describe('Content blocks for this version'),
  options: z.record(z.string(), z.unknown()).optional().describe('Platform-specific options')
});

export let updatePost = SlateTool.create(spec, {
  name: 'Update Post',
  key: 'update_post',
  description: `Update an existing social media post in DotSimple. Modify content, scheduling, target accounts, tags, and platform-specific options.`,
  instructions: [
    'Provide the post UUID to identify which post to update.',
    'Only include fields you want to change.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      postUuid: z.string().describe('UUID of the post to update'),
      accountIds: z.array(z.number()).optional().describe('Updated array of account IDs'),
      versions: z.array(versionSchema).optional().describe('Updated content versions'),
      tagIds: z.array(z.number()).optional().describe('Updated array of tag IDs'),
      date: z.string().optional().describe('Updated scheduled date in YYYY-MM-DD format'),
      time: z.string().optional().describe('Updated scheduled time in HH:mm format'),
      timezone: z.string().optional().describe('Updated timezone'),
      schedule: z.boolean().optional().describe('Whether to schedule the post'),
      scheduleNow: z.boolean().optional().describe('Whether to publish the post immediately'),
      queue: z.boolean().optional().describe('Whether to add to the publishing queue')
    })
  )
  .output(
    z.object({
      postId: z.number().optional().describe('Numeric ID of the updated post'),
      postUuid: z.string().optional().describe('UUID of the updated post'),
      status: z.string().optional().describe('Status of the updated post')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DotSimpleClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId
    });

    let data: Record<string, unknown> = {};
    if (ctx.input.accountIds) data.accounts = ctx.input.accountIds;
    if (ctx.input.tagIds) data.tags = ctx.input.tagIds;
    if (ctx.input.date) data.date = ctx.input.date;
    if (ctx.input.time) data.time = ctx.input.time;
    if (ctx.input.timezone) data.timezone = ctx.input.timezone;
    if (ctx.input.schedule !== undefined) data.schedule = ctx.input.schedule;
    if (ctx.input.scheduleNow !== undefined) data.schedule_now = ctx.input.scheduleNow;
    if (ctx.input.queue !== undefined) data.queue = ctx.input.queue;
    if (ctx.input.versions) {
      data.versions = ctx.input.versions.map(v => ({
        account_id: v.accountId,
        is_original: v.isOriginal,
        content: v.content.map(c => ({
          body: c.body,
          url: c.url,
          media: c.media
        })),
        options: v.options
      }));
    }

    let result = await client.updatePost(ctx.input.postUuid, data as any);

    return {
      output: {
        postId: result?.id,
        postUuid: result?.uuid ?? ctx.input.postUuid,
        status: result?.status
      },
      message: `Post \`${ctx.input.postUuid}\` updated successfully.${result?.status ? ` Status: **${result.status}**` : ''}`
    };
  })
  .build();
