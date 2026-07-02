import { SlateTool } from 'slates';
import { z } from 'zod';
import { DotSimpleClient } from '../lib/client';
import { spec } from '../spec';

let contentSchema = z.object({
  body: z.string().describe('The text content of the post'),
  url: z
    .string()
    .optional()
    .describe('A URL to include in the post. Supported by Facebook and LinkedIn.'),
  media: z
    .array(z.number())
    .optional()
    .describe('Array of media file IDs to attach to this content version')
});

let versionSchema = z.object({
  accountId: z
    .number()
    .describe('The account ID this version targets. Use 0 for the original/default version.'),
  isOriginal: z
    .boolean()
    .default(true)
    .describe('Whether this is the original version of the post'),
  content: z.array(contentSchema).describe('Content blocks for this version'),
  options: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'Platform-specific options (e.g., TikTok privacy, YouTube visibility, Instagram post type)'
    )
});

export let createPost = SlateTool.create(spec, {
  name: 'Create Post',
  key: 'create_post',
  description: `Create a new social media post in DotSimple. Supports scheduling for a specific date/time, immediate publishing, or adding to the publishing queue. Posts can target multiple social accounts with platform-specific content versions.`,
  instructions: [
    'Provide at least one account ID and one content version.',
    'To schedule a post, set date, time, and timezone along with schedule=true.',
    'To publish immediately, set scheduleNow=true.',
    'To add to the publishing queue, set queue=true.',
    'Use the List Accounts tool first to get available account IDs.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      accountIds: z.array(z.number()).describe('Array of account IDs to post to'),
      versions: z.array(versionSchema).describe('Content versions for the post'),
      tagIds: z
        .array(z.number())
        .optional()
        .describe('Array of tag IDs to associate with the post'),
      date: z.string().optional().describe('Scheduled date in YYYY-MM-DD format'),
      time: z.string().optional().describe('Scheduled time in HH:mm format'),
      timezone: z
        .string()
        .optional()
        .describe('Timezone for scheduling, e.g. "Europe/Vienna"'),
      schedule: z
        .boolean()
        .optional()
        .describe('Whether to schedule the post for the specified date/time'),
      scheduleNow: z.boolean().optional().describe('Whether to publish the post immediately'),
      queue: z.boolean().optional().describe('Whether to add the post to the publishing queue')
    })
  )
  .output(
    z.object({
      postId: z.number().optional().describe('Numeric ID of the created post'),
      postUuid: z.string().optional().describe('UUID of the created post'),
      status: z.string().optional().describe('Status of the created post')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DotSimpleClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId
    });

    let result = await client.createPost({
      accounts: ctx.input.accountIds,
      tags: ctx.input.tagIds,
      date: ctx.input.date,
      time: ctx.input.time,
      timezone: ctx.input.timezone,
      schedule: ctx.input.schedule,
      schedule_now: ctx.input.scheduleNow,
      queue: ctx.input.queue,
      versions: ctx.input.versions.map(v => ({
        account_id: v.accountId,
        is_original: v.isOriginal,
        content: v.content.map(c => ({
          body: c.body,
          url: c.url,
          media: c.media
        })),
        options: v.options
      }))
    });

    return {
      output: {
        postId: result?.id,
        postUuid: result?.uuid,
        status: result?.status
      },
      message: `Post created successfully${result?.uuid ? ` with UUID \`${result.uuid}\`` : ''}.${result?.status ? ` Status: **${result.status}**` : ''}`
    };
  })
  .build();
