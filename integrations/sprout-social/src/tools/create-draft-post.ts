import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { customerIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createDraftPost = SlateTool.create(spec, {
  name: 'Create Draft Post',
  key: 'create_draft_post',
  description: `Create a draft publishing post in Sprout Social intended for future publication to social networks. Posts are created on the Sprout Publishing Calendar and can target multiple profiles and scheduled times. Sprout will fan out one calendar entry per profile/time combination.`,
  instructions: [
    'Get group IDs and customer profile IDs from the Get Metadata tool before creating posts.',
    'All target profiles must belong to the same group.',
    'Scheduled times must be in UTC ISO 8601 format and must be in the future.',
    'If providing media, upload it first using the Upload Media tool to get a media_id.'
  ],
  constraints: [
    'Only draft posts can be created via the API.',
    'Instagram Mobile Publisher and story posts cannot be created.',
    'Seconds in scheduled times are rounded down to the minute.',
    'Unsupported target profiles can be omitted without an API error. Check acceptedProfileIds and omittedProfileIds.',
    'No draft delete endpoint is documented by the public API; retained drafts require calendar reconciliation.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      customerId: customerIdSchema,
      groupId: z.number().describe('Group ID that the target profiles belong to.'),
      customerProfileIds: z
        .array(z.number())
        .describe('Array of customer_profile_id values to publish to.'),
      text: z.string().optional().describe('Text content of the post.'),
      media: z
        .array(
          z.object({
            mediaId: z.string().describe('Media ID from a previous upload.'),
            mediaType: z
              .enum(['PHOTO', 'VIDEO', 'DOCUMENT'])
              .describe('Type of the media; support depends on the target social network.')
          })
        )
        .optional()
        .describe('Media attachments for the post.'),
      scheduledTimes: z
        .array(z.string())
        .optional()
        .describe(
          'Array of UTC ISO 8601 timestamps for scheduled delivery (e.g., "2024-06-30T18:20:00Z").'
        ),
      tagIds: z.array(z.number()).optional().describe('Array of tag IDs to apply to the post.')
    })
  )
  .output(
    z.object({
      posts: z
        .array(z.any())
        .describe('Array of fanned-out publishing post entries created by Sprout.'),
      publishingPostIds: z
        .array(z.string())
        .optional()
        .describe('Distinct observed calendar IDs for readback or reconciliation.'),
      acceptedProfileIds: z
        .array(z.number())
        .optional()
        .describe('Profiles present in the returned draft entries.'),
      omittedProfileIds: z
        .array(z.number())
        .optional()
        .describe(
          'Requested profiles absent from the returned entries; no draft creation is confirmed for them.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      customerId: ctx.input.customerId ?? ctx.config.customerId
    });

    let delivery = ctx.input.scheduledTimes?.length
      ? {
          scheduledTimes: ctx.input.scheduledTimes,
          type: 'SCHEDULED'
        }
      : undefined;

    let result = await client.createPublishingPost({
      groupId: ctx.input.groupId,
      customerProfileIds: ctx.input.customerProfileIds,
      isDraft: true,
      text: ctx.input.text,
      media: ctx.input.media,
      delivery,
      tagIds: ctx.input.tagIds
    });

    let posts = result.data;
    const acceptedProfileIds = [
      ...new Set<number>(
        posts.map((value: { customer_profile_id: string | number }) =>
          Number(value.customer_profile_id)
        )
      )
    ];
    const omittedProfileIds = ctx.input.customerProfileIds.filter(
      value => !acceptedProfileIds.includes(value)
    );
    const publishingPostIds = [
      ...new Set<string>(
        posts.map(
          (value: { internal: { publishing: { publishing_post_id: string | number } } }) =>
            String(value.internal.publishing.publishing_post_id)
        )
      )
    ];

    return {
      output: { posts, publishingPostIds, acceptedProfileIds, omittedProfileIds },
      message: `Created **${posts.length}** draft post entr${posts.length === 1 ? 'y' : 'ies'} for **${acceptedProfileIds.length}** confirmed profile(s).${omittedProfileIds.length ? ' Some requested profiles were omitted; inspect the returned IDs.' : ''}`
    };
  });
