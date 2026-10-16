import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  mapSchedule,
  optionalString,
  rawSchema,
  requiredString,
  responseArray,
  responseData,
  responseRecord,
  upsertGroups
} from '../lib/responses';
import { spec } from '../spec';

let mediaAttachment = z.object({
  mediaId: z.string().describe('ID of an uploaded media file'),
  options: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Platform-specific media options')
});

let facebookOptions = z
  .object({
    postType: z
      .enum(['REELS', 'STORY', 'default'])
      .optional()
      .describe('Post type. Omit for standard post'),
    firstComment: z.boolean().optional().describe('Enable first comment'),
    firstCommentContent: z.string().optional().describe('Content of the first comment'),
    link: z.string().optional().describe('Link to embed in the post'),
    locationId: z.string().optional().describe('Facebook location ID for tagging')
  })
  .optional();

let instagramOptions = z
  .object({
    postType: z
      .number()
      .optional()
      .describe('0 = Post, 2 = Story. Reels auto-detected from media'),
    firstComment: z.boolean().optional().describe('Enable first comment'),
    firstCommentContent: z.string().optional().describe('Content of the first comment'),
    locationId: z.string().optional().describe('Instagram location ID for tagging'),
    shareToFeed: z.boolean().optional().describe('Share Reels to feed'),
    collaborators: z.array(z.string()).optional().describe('Up to 3 collaborator usernames')
  })
  .optional();

let linkedinOptions = z
  .object({
    firstComment: z.boolean().optional().describe('Enable first comment'),
    firstCommentContent: z.string().optional().describe('Content of the first comment'),
    link: z.string().optional().describe('Link to embed in the post')
  })
  .optional();

let twitterThread = z.object({
  content: z.string().optional().describe('Tweet text content'),
  media: z.array(mediaAttachment).optional().describe('Media attachments for this tweet')
});

let twitterOptions = z
  .object({
    threads: z.array(twitterThread).optional().describe('Thread chain with multiple tweets')
  })
  .optional();

let tiktokOptions = z
  .object({
    title: z.string().optional().describe('Caption with auto-detected hashtags/mentions'),
    privacyLevel: z
      .enum([
        'PUBLIC_TO_EVERYONE',
        'MUTUAL_FOLLOW_FRIENDS',
        'FOLLOWER_OF_CREATOR',
        'SELF_ONLY'
      ])
      .describe('Privacy level (required for TikTok)'),
    disableDuet: z.boolean().optional().describe('Disable duet'),
    disableStitch: z.boolean().optional().describe('Disable stitch'),
    disableComment: z.boolean().optional().describe('Disable comments'),
    photoCoverIndex: z.number().optional().describe('Index of photo to use as cover'),
    isBrandedContent: z.boolean().optional().describe('Disclose as branded content'),
    isBrandOrganic: z.boolean().optional().describe('Brand organic content flag')
  })
  .optional();

let youtubeOptions = z
  .object({
    title: z.string().optional().describe('Video title'),
    privacyStatus: z
      .enum(['public', 'unlisted', 'private'])
      .optional()
      .describe('Video privacy status'),
    categoryId: z.string().optional().describe('YouTube category ID'),
    selfDeclaredMadeForKids: z.boolean().optional().describe('Made for kids declaration'),
    notifySubscribers: z.boolean().optional().describe('Notify subscribers'),
    allowEmbedding: z.boolean().optional().describe('Allow video embedding'),
    firstCommentEnabled: z.boolean().optional().describe('Enable first comment'),
    firstComment: z.string().optional().describe('Content of the first comment')
  })
  .optional();

let pinterestOptions = z
  .object({
    boardId: z.string().describe('Pinterest board ID (required for publishing)'),
    title: z.string().optional().describe('Pin title'),
    link: z.string().optional().describe('Pin destination link')
  })
  .optional();

let mastodonOptions = z
  .object({
    visibility: z
      .enum(['public', 'unlisted', 'private', 'direct'])
      .optional()
      .describe('Post visibility'),
    firstCommentEnabled: z.boolean().optional().describe('Enable first comment'),
    firstCommentContent: z.string().optional().describe('Content of the first comment'),
    pollOptions: z
      .array(z.string())
      .optional()
      .describe('Poll choices (up to 4, max 25 chars each)'),
    pollExpiresIn: z
      .number()
      .optional()
      .describe('Poll expiration in seconds (300/900/3600/18000/86400/259200/432000)'),
    pollMultiple: z.boolean().optional().describe('Allow multiple poll selections')
  })
  .optional();

let threadsOptions = z
  .object({
    link: z.string().optional().describe('Link to embed')
  })
  .optional();

let platformOptions = z
  .object({
    facebook: facebookOptions,
    instagram: instagramOptions,
    linkedin: linkedinOptions,
    twitter: twitterOptions,
    tiktok: tiktokOptions,
    youtube: youtubeOptions,
    pinterest: pinterestOptions,
    mastodon: mastodonOptions,
    threads: threadsOptions
  })
  .optional()
  .describe(
    "Platform-specific options. Only provide options for the target channel's social network"
  );

let scheduleResultSchema = z.object({
  scheduleGroupId: z.string().optional().describe('ID of the created schedule group'),
  schedules: z
    .array(
      z.object({
        scheduleId: z.string().describe('ID of the created schedule'),
        channelId: z.string().describe('Channel the post is scheduled to'),
        status: z.string().optional().describe('Schedule status'),
        publishOn: z.string().optional().describe('Scheduled publish time (ISO 8601)'),
        raw: rawSchema
      })
    )
    .describe('Created schedule entries')
});

export let schedulePost = SlateTool.create(spec, {
  name: 'Schedule Post',
  key: 'schedule_post',
  description: `Schedule a social media post to one or more channels. Supports all platform-specific options including first comments, location tagging, thread chains, polls, privacy levels, and more.
Posts can be scheduled for a future date or published immediately by omitting the publish time. Provide platform-specific options matching the target channel's social network.`,
  instructions: [
    'Use "List Channels" to find valid channel IDs before scheduling.',
    'For Pinterest, a boardId is required - use "List Pinterest Boards" to find valid board IDs.',
    'For TikTok, privacyLevel is required.',
    'Media must be uploaded first using the media tools. Pass mediaId values in the media array.',
    "Platform options should match the target channel's social network type.",
    'For mixed-network posts, use channelPlatformOptions to provide separate options for each channel. Global platformOptions must contain at most one network.'
  ],
  constraints: [
    'Maximum 3 collaborators for Instagram posts.',
    'Mastodon polls support up to 4 options with max 25 characters each.',
    'Twitter threads support multiple tweets in sequence.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      channelIds: z.array(z.string()).describe('Channel IDs to publish to'),
      content: z.string().optional().describe('Post text content'),
      publishOn: z
        .string()
        .optional()
        .describe('ISO 8601 datetime for scheduled publishing. Omit for immediate publishing'),
      media: z.array(mediaAttachment).optional().describe('Media files to attach to the post'),
      platformOptions: platformOptions,
      channelPlatformOptions: z
        .array(
          z.object({
            channelId: z.string().describe('Target channel ID from list_channels'),
            options: platformOptions
              .unwrap()
              .describe('Options for exactly one social network, matching this channel')
          })
        )
        .optional()
        .describe(
          'Per-channel options for mixed-network publishing; overrides platformOptions for each listed channel'
        )
    })
  )
  .output(scheduleResultSchema)
  .handleInvocation(async ctx => {
    if (ctx.input.channelIds.length === 0 || ctx.input.channelIds.some(id => !id.trim())) {
      throw createApiServiceError(
        'Provide at least one nonempty channel ID from list_channels.'
      );
    }
    let client = new Client({ token: ctx.auth.token });
    let channelOptions = new Map<string, NonNullable<z.infer<typeof platformOptions>>>();
    for (let entry of ctx.input.channelPlatformOptions ?? []) {
      if (!ctx.input.channelIds.includes(entry.channelId)) {
        throw createApiServiceError(
          'Every channelPlatformOptions channelId must be included in channelIds.'
        );
      }
      if (channelOptions.has(entry.channelId)) {
        throw createApiServiceError(
          'Provide only one channelPlatformOptions entry per channel.'
        );
      }
      channelOptions.set(entry.channelId, entry.options);
    }
    let buildOptions = (
      po: z.infer<typeof platformOptions>
    ): Record<string, unknown> | undefined => {
      if (!po) return undefined;
      let selected = Object.entries(po).filter(([, value]) => value !== undefined);
      if (selected.length > 1) {
        throw createApiServiceError(
          'Provide options for at most one network per channel. Use channelPlatformOptions for mixed-network publishing.'
        );
      }
      let selectedEntry = selected[0];
      if (!selectedEntry) return undefined;
      let [network, value] = selectedEntry;
      let options: Record<string, unknown> = { ...value };
      if (
        (network === 'facebook' || network === 'instagram') &&
        typeof options.locationId === 'string'
      ) {
        options.location = { id: options.locationId };
        options.locationId = undefined;
      }
      if (
        network === 'instagram' &&
        po.instagram?.collaborators &&
        po.instagram.collaborators.length > 3
      ) {
        throw createApiServiceError('Instagram supports at most three collaborators.');
      }
      if (network === 'twitter') {
        options.threads = po.twitter?.threads?.map(thread => ({
          content: thread.content,
          media: thread.media?.map(media => ({ id: media.mediaId, options: media.options }))
        }));
      }
      if (network === 'mastodon') {
        let poll = po.mastodon?.pollOptions;
        if (poll && (poll.length > 4 || poll.some(choice => choice.length > 25))) {
          throw createApiServiceError(
            'Mastodon polls allow at most four choices with at most 25 characters each.'
          );
        }
      }
      return options;
    };
    let schedules = ctx.input.channelIds.map(channelId => ({
      channelId,
      content: ctx.input.content,
      publishOn: ctx.input.publishOn,
      media: ctx.input.media?.map(media => ({
        id: media.mediaId,
        options: media.options ?? {}
      })),
      options: buildOptions(channelOptions.get(channelId) ?? ctx.input.platformOptions)
    }));
    let result = await client.createSchedules(schedules);
    let groups = upsertGroups(responseData(result));
    if (groups.length === 0)
      throw createApiServiceError('Planly did not return created schedule groups.');
    let firstGroup = responseRecord(groups[0], 'created schedule group');
    let createdSchedules = groups.flatMap(value => {
      let group = responseRecord(value, 'created schedule group');
      return responseArray(group.schedules, 'created schedules').map(value => {
        let schedule = mapSchedule(value, group.publishOn ?? group.publish_on);
        return {
          scheduleId: schedule.scheduleId,
          channelId: requiredString(schedule.channelId, 'created schedule channel ID'),
          status: schedule.status,
          publishOn: optionalString(schedule.publishOn),
          raw: schedule.raw
        };
      });
    });
    if (createdSchedules.length === 0)
      throw createApiServiceError('Planly did not return created schedules.');
    return {
      output: {
        scheduleGroupId: requiredString(firstGroup.id, 'created schedule group ID'),
        schedules: createdSchedules
      },
      message: `Created ${createdSchedules.length} schedule(s) across ${groups.length} group(s).`
    };
  });
