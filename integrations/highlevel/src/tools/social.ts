import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { createHighLevelClient } from '../lib/client';
import { highLevelScope } from '../lib/scopes';
import { spec } from '../spec';

const postType = z.enum(['post', 'story', 'reel']);
const postId = z
  .string()
  .min(1)
  .describe(
    'Post ID returned by socialmediaposting_get_posts or socialmediaposting_create_post.'
  );
const accountIds = z
  .array(z.string().min(1))
  .describe('Connected account IDs from socialmediaposting_get_account.');
const timestamp = z.string().datetime({ offset: true });
const httpsUrl = z
  .string()
  .url()
  .regex(/^https:\/\//, 'Use a public HTTPS URL.');
const dateParts = z.object({
  year: z.number().int().describe('Calendar year.'),
  month: z.number().int().min(1).max(12).describe('Month, 1 through 12.'),
  day: z.number().int().min(1).max(31).describe('Day of month.')
});
const timeParts = z.object({
  hours: z.number().int().min(0).max(23).describe('Hour, 0 through 23.'),
  minutes: z.number().int().min(0).max(59).describe('Minute.'),
  seconds: z.number().int().min(0).max(59).describe('Second.')
});
const mediaSchema = z.object({
  url: httpsUrl.describe('Publicly accessible HTTPS media URL.'),
  type: z
    .enum([
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'video/mp4',
      'video/mov',
      'video/webm'
    ])
    .describe('Media MIME type; platform support varies.'),
  caption: z.string().optional().describe('Media caption.'),
  altText: z
    .string()
    .optional()
    .describe(
      'Accessible image description; supported platforms apply their own length limits.'
    ),
  thumbnail: httpsUrl
    .optional()
    .describe('JPEG or PNG cover URL for the first video; later video thumbnails are ignored.')
});

const postFields = {
  status: z
    .enum([
      'draft',
      'scheduled',
      'in_review',
      'published',
      'in_progress',
      'pending',
      'failed',
      'notification_sent',
      'deleted'
    ])
    .describe(
      'Explicit requested post state. Use draft for unpublished content; other states can trigger publishing or notifications.'
    ),
  type: postType.describe(
    'Post format; reels require one video, and stories have platform-specific caption restrictions.'
  ),
  accountIds: accountIds
    .min(1)
    .describe(
      'One or more connected social account IDs from socialmediaposting_get_account, including for drafts.'
    ),
  summary: z
    .string()
    .optional()
    .describe(
      'Caption shared across selected accounts. HighLevel may truncate it to the strictest selected platform limit.'
    ),
  media: z
    .array(mediaSchema)
    .optional()
    .describe(
      'Media shared across selected accounts. Each destination applies its own item limit.'
    ),
  scheduleDate: timestamp
    .optional()
    .describe('ISO 8601 scheduled time with timezone, required for scheduled and in_review.'),
  selectedBestTime: z
    .string()
    .optional()
    .describe('Selected provider best-time scheduling slot.'),
  createdBy: z
    .string()
    .regex(/^[a-fA-F0-9]{24}$/)
    .optional()
    .describe('Creator ID in the provider-required 24-character hexadecimal format.'),
  userId: z
    .string()
    .min(1)
    .optional()
    .describe(
      'HighLevel user ID managing the post, including drafts. Defaults to the user returned during OAuth connection. Otherwise supply an existing sub-account user identifier from your administrator.'
    ),
  followUpComment: z
    .string()
    .optional()
    .describe(
      'Follow-up comment. Unsupported by Google Business Profile and Pinterest; TikTok requires a public video.'
    ),
  ogTagsDetails: z
    .object({
      metaImage: httpsUrl.optional().describe('Link preview image URL.'),
      metaLink: z.string().url().optional().describe('Link preview destination.'),
      ogTitle: z.string().optional().describe('Link preview title.'),
      ogDescription: z.string().optional().describe('Link preview description.')
    })
    .optional()
    .describe('Link preview metadata.'),
  postApprovalDetails: z
    .object({
      approver: z
        .string()
        .min(1)
        .optional()
        .describe('Approving user ID; required when submitting for review.'),
      requesterNote: z.string().optional().describe('Note requesting approval.'),
      approverNote: z.string().optional().describe('Approver feedback.'),
      approvalStatus: z
        .enum(['pending', 'approved', 'rejected', 'not_required'])
        .optional()
        .describe('Approval workflow state.')
    })
    .optional()
    .describe('Approval workflow details; submitting a post may notify the approver.'),
  scheduleTimeUpdated: z
    .boolean()
    .optional()
    .describe('Whether the scheduling time was manually changed.'),
  tags: z
    .array(z.string().regex(/^[a-fA-F0-9]{24}$/))
    .optional()
    .describe('Existing Social Planner tag IDs; supplying this list replaces the post tags.'),
  categoryId: z
    .string()
    .regex(/^[a-fA-F0-9]{24}$/)
    .optional()
    .describe('Existing Social Planner category ID.'),
  applyWatermark: z
    .boolean()
    .optional()
    .describe('Apply configured watermarks to images; videos are unaffected.'),
  tiktokPostDetails: z
    .object({
      privacyLevel: z
        .enum(['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY'])
        .optional()
        .describe('TikTok audience.'),
      enableComment: z.boolean().optional().describe('Allow comments.'),
      enableDuet: z.boolean().optional().describe('Allow duets.'),
      enableStitch: z.boolean().optional().describe('Allow stitching.'),
      videoDisclosure: z
        .boolean()
        .optional()
        .describe('Enable branded-content disclosure; incompatible with SELF_ONLY.'),
      promoteYourBrand: z
        .boolean()
        .optional()
        .describe('The content promotes your own brand.'),
      promoteOtherBrand: z.boolean().optional().describe('The content promotes another brand.')
    })
    .optional()
    .describe('TikTok publishing options.'),
  gmbPostDetails: z
    .object({
      gmbEventType: z
        .enum(['STANDARD', 'EVENT', 'OFFER'])
        .describe('Google Business Profile post kind.'),
      title: z.string().max(58).optional().describe('Event title, required for EVENT.'),
      offerTitle: z.string().optional().describe('Offer title, required for OFFER.'),
      startDate: z
        .object({
          startDate: dateParts.describe('Start date.'),
          startTime: timeParts.describe('Start time.')
        })
        .optional()
        .describe('Required for EVENT and OFFER.'),
      endDate: z
        .object({
          endDate: dateParts.describe('End date.'),
          endTime: timeParts.describe('End time.')
        })
        .optional()
        .describe('Required for EVENT and OFFER; must follow the start.'),
      termsConditions: z.string().url().optional().describe('Terms URL, required for OFFER.'),
      couponCode: z.string().optional().describe('Coupon, required for OFFER.'),
      redeemOnlineUrl: z
        .string()
        .url()
        .optional()
        .describe('Redemption URL, required for OFFER.'),
      actionType: z
        .enum(['none', 'order', 'book', 'shop', 'learn_more', 'call', 'sign_up'])
        .optional()
        .describe('Call to action; all except none and call require url.'),
      url: z.string().url().optional().describe('Call-to-action URL.')
    })
    .optional()
    .describe('Google Business Profile event, offer, or update options.'),
  linkedinPostDetails: z
    .object({
      postAsPdf: z.boolean().optional().describe('Publish images as a PDF carousel.'),
      pdfTitle: z.string().max(100).optional().describe('PDF carousel title.'),
      poll: z
        .object({
          question: z.string().min(1).max(140).describe('Poll question.'),
          options: z
            .array(
              z.object({ text: z.string().min(1).max(30).describe('Unique answer text.') })
            )
            .min(2)
            .max(4)
            .describe('Two to four unique answers.'),
          settings: z
            .object({
              duration: z
                .enum(['ONE_DAY', 'THREE_DAYS', 'SEVEN_DAYS', 'FOURTEEN_DAYS'])
                .describe('Voting duration.')
            })
            .describe('Poll settings.')
        })
        .optional()
        .describe(
          'LinkedIn poll; incompatible with media and link previews, and cannot be edited after publishing.'
        )
    })
    .optional()
    .describe('LinkedIn publishing options.'),
  pinterestPostDetails: z
    .object({
      title: z.string().max(100).optional().describe('Pin title.'),
      link: z.string().url().max(2048).optional().describe('Pin destination URL.'),
      pinterestBoards: z
        .array(
          z.object({
            accountId: z.string().min(1).describe('Connected Pinterest account identifier.'),
            boards: z
              .array(z.string().min(1))
              .min(1)
              .max(25)
              .describe('Board IDs on that account, at most 25.')
          })
        )
        .min(1)
        .describe('Board selections per account; each board creates a separate child post.')
    })
    .optional()
    .describe('Pinterest board selection, required when publishing to Pinterest.'),
  facebookPostDetails: z
    .object({
      type: postType.describe('Facebook format; groups do not support reels.'),
      textFormatPresetId: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
          'Facebook background preset for text-only feed posts with captions of at most 130 characters.'
        )
    })
    .optional()
    .describe('Facebook-specific format options.'),
  instagramPostDetails: z
    .object({
      type: postType.describe('Instagram format; media is required for publishing.'),
      collaborators: z
        .record(z.string(), z.array(z.string().min(1)).max(5))
        .optional()
        .describe(
          'Account IDs mapped to up to five unique usernames without @; supported for posts and reels.'
        ),
      showOnFeed: z.boolean().optional().describe('Display the reel on the profile feed.'),
      publishViaPushNotification: z
        .boolean()
        .optional()
        .describe('Publish an Instagram story manually through a push notification.'),
      publisherNote: z
        .string()
        .optional()
        .describe(
          'Manual publishing instructions when push-notification publishing is enabled.'
        )
    })
    .optional()
    .describe('Instagram publishing options.'),
  youtubePostDetails: z
    .object({
      type: z.enum(['video', 'short']).describe('YouTube video format.'),
      title: z.string().max(100).optional().describe('YouTube video title.'),
      privacyLevel: z
        .enum(['private', 'public', 'unlisted'])
        .optional()
        .describe('YouTube visibility.')
    })
    .optional()
    .describe('YouTube options; publishing requires exactly one video.'),
  communityPostDetails: z
    .object({
      title: z.string().min(1).max(1000).describe('Community post title.'),
      notifyAllGroupMembers: z
        .boolean()
        .optional()
        .describe('Notify every group member when publishing.'),
      postAsUser: z
        .record(
          z.string(),
          z.object({
            id: z.string().min(1).describe('Eligible community member contact ID.'),
            name: z.string().optional().describe('Author display name.'),
            avatar: z.string().url().optional().describe('Author avatar URL.')
          })
        )
        .describe(
          'Community account IDs mapped to the member to publish as; each selected Community account needs an entry.'
        )
    })
    .optional()
    .describe('Community publishing identity and notifications.')
};

export const socialPostInputSchema = z.object(postFields);
type PostInput = z.infer<typeof socialPostInputSchema>;

const validatePost = (input: PostInput) => {
  if ((input.status === 'scheduled' || input.status === 'in_review') && !input.scheduleDate) {
    throw createApiServiceError('Provide scheduleDate for scheduled or in_review posts.');
  }
  if (input.status === 'in_review' && !input.postApprovalDetails?.approver) {
    throw createApiServiceError(
      'Provide postApprovalDetails.approver when submitting a post for review.'
    );
  }
  const tiktok = input.tiktokPostDetails;
  if (
    tiktok?.videoDisclosure &&
    (tiktok.privacyLevel === 'SELF_ONLY' ||
      (!tiktok.promoteYourBrand && !tiktok.promoteOtherBrand))
  ) {
    throw createApiServiceError(
      'TikTok branded-content disclosure requires a non-private audience and at least one brand promotion flag.'
    );
  }
  const poll = input.linkedinPostDetails?.poll;
  if (
    poll &&
    (input.media?.length ||
      input.ogTagsDetails?.metaLink ||
      new Set(poll.options.map(option => option.text)).size !== poll.options.length)
  ) {
    throw createApiServiceError(
      'LinkedIn polls require unique answers and cannot include media or a link preview.'
    );
  }
  const google = input.gmbPostDetails;
  if (google && google.gmbEventType !== 'STANDARD' && (!google.startDate || !google.endDate)) {
    throw createApiServiceError(
      'Google Business Profile events and offers require startDate and endDate.'
    );
  }
  if (google?.gmbEventType === 'EVENT' && !google.title) {
    throw createApiServiceError('Provide title for a Google Business Profile event.');
  }
  if (
    google?.gmbEventType === 'OFFER' &&
    (!google.offerTitle ||
      !google.termsConditions ||
      !google.couponCode ||
      !google.redeemOnlineUrl)
  ) {
    throw createApiServiceError(
      'Google Business Profile offers require offerTitle, termsConditions, couponCode, and redeemOnlineUrl.'
    );
  }
  if (google?.actionType && !['none', 'call'].includes(google.actionType) && !google.url) {
    throw createApiServiceError(
      'Provide url for the selected Google Business Profile call to action.'
    );
  }
};

const postRecordSchema = z
  .object({
    _id: z.string(),
    locationId: z.string().optional(),
    status: z.string().optional(),
    summary: z.string().optional(),
    accountIds: z.array(z.string()).optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    scheduleDate: z.string().optional()
  })
  .passthrough();
const postOutputSchema = z.object({
  id: z.string().describe('Post ID for readback, editing, or cleanup.'),
  locationId: z.string().describe('Connected sub-account ID.'),
  status: z
    .string()
    .optional()
    .describe(
      'Provider-reported state; acceptance does not guarantee delivery to every platform.'
    ),
  summary: z.string().optional().describe('Returned post caption.'),
  accountIds: z.array(z.string()).optional().describe('Returned connected account IDs.'),
  createdAt: z.string().optional().describe('Provider creation time.'),
  updatedAt: z.string().optional().describe('Provider update time.'),
  scheduleDate: z.string().optional().describe('Provider scheduled time.'),
  record: z
    .record(z.string(), z.unknown())
    .describe(
      'Additional provider post fields, including child-platform results when available.'
    )
});
type PostRecord = z.infer<typeof postRecordSchema>;
const mapPost = (post: PostRecord, locationId: string) => {
  if (post.locationId && post.locationId !== locationId)
    throw createApiServiceError(
      'HighLevel returned a post outside the connected sub-account.'
    );
  return {
    id: post._id,
    locationId,
    status: post.status,
    summary: post.summary,
    accountIds: post.accountIds,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    scheduleDate: post.scheduleDate,
    record: post
  };
};
const readPost = (response: unknown, locationId: string) => {
  const parsed = z
    .object({ results: z.object({ post: postRecordSchema }) })
    .safeParse(response);
  if (!parsed.success)
    throw createApiServiceError(
      'HighLevel did not return a post with an ID. Check Social Planner before retrying a write.'
    );
  return mapPost(parsed.data.results.post, locationId);
};
const publishingConstraints = [
  'Captions and follow-up comments can be truncated to the strictest selected platform limit. Use separate requests for platform-specific content.',
  'Instagram requires media; reels and YouTube require one video. Facebook groups do not support reels, and directly published Facebook/Instagram stories do not support captions.',
  'Pinterest requires board selections; Community posts require eligible member identities. Platform restrictions are also enforced by HighLevel.',
  'A successful request confirms provider acceptance, not publication to every destination. Read back the post to inspect results.'
];

export const socialGetAccount = SlateTool.create(spec, {
  key: 'socialmediaposting_get_account',
  name: 'Get Social Accounts',
  description:
    'Discover connected social account IDs, names, platforms, and account groups for this sub-account.',
  tags: { readOnly: true, destructive: false }
})
  .scopes(highLevelScope('socialplanner/account.readonly'))
  .input(z.object({}))
  .output(
    z.object({
      locationId: z.string(),
      accounts: z.array(
        z
          .object({
            id: z.string(),
            name: z.string().optional(),
            platform: z.string().optional()
          })
          .passthrough()
      ),
      groups: z.array(z.object({ id: z.string(), name: z.string().optional() }).passthrough())
    })
  )
  .handleInvocation(async ctx => {
    const client = createHighLevelClient(ctx.auth);
    const response = await client.request<unknown>({
      method: 'GET',
      path: `/social-media-posting/${encodeURIComponent(client.locationId)}/accounts`,
      scope: 'socialplanner/account.readonly'
    });
    const parsed = z
      .object({
        results: z.object({
          accounts: z.array(
            z
              .object({
                id: z.string(),
                name: z.string().optional(),
                platform: z.string().optional()
              })
              .passthrough()
          ),
          groups: z
            .array(z.object({ id: z.string(), name: z.string().optional() }).passthrough())
            .optional()
        })
      })
      .safeParse(response);
    if (!parsed.success)
      throw createApiServiceError('HighLevel returned an invalid social account response.');
    return {
      output: {
        locationId: client.locationId,
        accounts: parsed.data.results.accounts,
        groups: parsed.data.results.groups ?? []
      },
      message: `Found ${parsed.data.results.accounts.length} connected social accounts.`
    };
  })
  .build();

const rangeSchema = z.object({
  startDate: timestamp.describe('Inclusive period start with timezone.'),
  endDate: timestamp.describe('Inclusive period end with timezone.')
});
export const socialGetStatistics = SlateTool.create(spec, {
  key: 'socialmediaposting_get_social_media_statistics',
  name: 'Get Social Media Statistics',
  description:
    'Read social analytics for connected accounts, optionally comparing two date ranges.',
  tags: { readOnly: true, destructive: false }
})
  .scopes(highLevelScope('socialplanner/statistics.readonly'))
  .input(
    z.object({
      profileIds: accountIds
        .min(1)
        .max(100)
        .describe(
          'Between 1 and 100 connected account IDs from socialmediaposting_get_account. At least one account is required.'
        ),
      platforms: z
        .array(
          z.enum([
            'facebook',
            'instagram',
            'linkedin',
            'google',
            'pinterest',
            'youtube',
            'tiktok'
          ])
        )
        .optional()
        .describe('Platforms to include; omit for all supported platforms.'),
      currentRange: rangeSchema
        .optional()
        .describe(
          'Current reporting period. Omit for the provider default of the last seven complete days.'
        ),
      prevRange: rangeSchema.optional().describe('Optional comparison period.')
    })
  )
  .output(
    z.object({
      locationId: z.string(),
      profileIds: z.array(z.string()).optional(),
      currentRange: rangeSchema.optional(),
      prevRange: rangeSchema.optional(),
      grouping: z.string().optional(),
      dayRange: z.array(z.string()).optional(),
      totals: z.record(z.string(), z.number()).optional(),
      statistics: z.record(z.string(), z.unknown()),
      traceId: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    for (const range of [ctx.input.currentRange, ctx.input.prevRange]) {
      if (range && Date.parse(range.startDate) > Date.parse(range.endDate))
        throw createApiServiceError(
          'Statistics range startDate must not be later than endDate.'
        );
    }
    const client = createHighLevelClient(ctx.auth);
    const response = await client.request<unknown>({
      method: 'POST',
      path: '/social-media-posting/statistics',
      scope: 'socialplanner/statistics.readonly',
      query: { locationId: client.locationId },
      body: pickDefined(ctx.input)
    });
    const parsed = z
      .object({
        results: z
          .object({
            grouping: z.string().optional(),
            dayRange: z.array(z.string()).optional(),
            totals: z.record(z.string(), z.number()).optional()
          })
          .passthrough(),
        traceId: z.string().optional()
      })
      .safeParse(response);
    if (!parsed.success)
      throw createApiServiceError('HighLevel returned an invalid social statistics response.');
    return {
      output: {
        locationId: client.locationId,
        profileIds: ctx.input.profileIds,
        currentRange: ctx.input.currentRange,
        prevRange: ctx.input.prevRange,
        grouping: parsed.data.results.grouping,
        dayRange: parsed.data.results.dayRange,
        totals: parsed.data.results.totals,
        statistics: parsed.data.results,
        traceId: parsed.data.traceId
      },
      message: 'Retrieved social media statistics.'
    };
  })
  .build();

export const socialCreatePost = SlateTool.create(spec, {
  key: 'socialmediaposting_create_post',
  name: 'Create Social Post',
  description:
    'Create a social post with an explicit draft, scheduling, review, or publishing state.',
  constraints: publishingConstraints,
  tags: { readOnly: false, destructive: false }
})
  .scopes(highLevelScope('socialplanner/post.write'))
  .input(socialPostInputSchema)
  .output(postOutputSchema)
  .handleInvocation(async ctx => {
    validatePost(ctx.input);
    const userId = ctx.input.userId ?? ctx.auth.userId;
    if (!userId) {
      throw createApiServiceError(
        'Provide userId for the HighLevel user managing this social post, including drafts. Ask your sub-account administrator for an existing user identifier.'
      );
    }
    const client = createHighLevelClient(ctx.auth);
    const response = await client.request<unknown>({
      method: 'POST',
      path: `/social-media-posting/${encodeURIComponent(client.locationId)}/posts`,
      scope: 'socialplanner/post.write',
      body: pickDefined({ ...ctx.input, userId })
    });
    return {
      output: readPost(response, client.locationId),
      message:
        'HighLevel accepted the social post creation. Read back its state to check publishing results.'
    };
  })
  .build();

export const socialGetPost = SlateTool.create(spec, {
  key: 'socialmediaposting_get_post',
  name: 'Get Social Post',
  description: 'Read a social post and its current platform publishing results.',
  tags: { readOnly: true, destructive: false }
})
  .scopes(highLevelScope('socialplanner/post.readonly'))
  .input(z.object({ id: postId }))
  .output(postOutputSchema)
  .handleInvocation(async ctx => {
    const client = createHighLevelClient(ctx.auth);
    const response = await client.request<unknown>({
      method: 'GET',
      path: `/social-media-posting/${encodeURIComponent(client.locationId)}/posts/${encodeURIComponent(ctx.input.id)}`,
      scope: 'socialplanner/post.readonly'
    });
    return {
      output: readPost(response, client.locationId),
      message: 'Retrieved the social post.'
    };
  })
  .build();

export const socialGetPosts = SlateTool.create(spec, {
  key: 'socialmediaposting_get_posts',
  name: 'Get Social Posts',
  description:
    'Read one bounded page of social posts filtered by state, accounts, dates, or format.',
  tags: { readOnly: true, destructive: false }
})
  .scopes(highLevelScope('socialplanner/post.readonly'))
  .input(
    z.object({
      type: z
        .enum([
          'recent',
          'all',
          'scheduled',
          'draft',
          'failed',
          'in_review',
          'published',
          'in_progress',
          'pending',
          'deleted'
        ])
        .optional()
        .describe('Post state filter; defaults to all.'),
      accounts: z
        .string()
        .optional()
        .describe('Comma-separated social account IDs from socialmediaposting_get_account.'),
      skip: z
        .string()
        .regex(/^\d{1,9}$/)
        .optional()
        .describe(
          'Numeric-string offset; pass nextSkip from the preceding response. Defaults to "0".'
        ),
      limit: z
        .string()
        .regex(/^(?:[1-9]|[1-9]\d|100)$/)
        .optional()
        .describe('Numeric-string page size, 1 through 100; defaults to "10".'),
      fromDate: timestamp.optional().describe('Earliest post date with timezone.'),
      toDate: timestamp.optional().describe('Latest post date with timezone.'),
      includeUsers: z
        .enum(['true', 'false'])
        .optional()
        .describe('Whether to include user data, as the provider-required string.'),
      postType: postType.optional().describe('Post format filter.')
    })
  )
  .output(
    z.object({
      locationId: z.string(),
      posts: z.array(postOutputSchema),
      total: z.number().optional(),
      skip: z.string(),
      limit: z.string(),
      nextSkip: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.fromDate &&
      ctx.input.toDate &&
      Date.parse(ctx.input.fromDate) > Date.parse(ctx.input.toDate)
    )
      throw createApiServiceError('fromDate must not be later than toDate.');
    const client = createHighLevelClient(ctx.auth);
    const skip = ctx.input.skip ?? '0';
    const limit = ctx.input.limit ?? '10';
    const response = await client.request<unknown>({
      method: 'POST',
      path: `/social-media-posting/${encodeURIComponent(client.locationId)}/posts/list`,
      scope: 'socialplanner/post.readonly',
      body: pickDefined({ ...ctx.input, skip, limit })
    });
    const parsed = z
      .object({
        results: z.object({ posts: z.array(postRecordSchema), count: z.number().optional() })
      })
      .safeParse(response);
    if (!parsed.success)
      throw createApiServiceError('HighLevel returned an invalid social post list response.');
    const { posts, count } = parsed.data.results;
    const nextOffset = Number(skip) + posts.length;
    const hasMore =
      posts.length > 0 &&
      (count !== undefined ? nextOffset < count : posts.length === Number(limit));
    return {
      output: {
        locationId: client.locationId,
        posts: posts.map(post => mapPost(post, client.locationId)),
        total: count,
        skip,
        limit,
        nextSkip: hasMore ? String(nextOffset) : null
      },
      message: `Retrieved ${posts.length} social posts.`
    };
  })
  .build();

export const socialEditPost = SlateTool.create(spec, {
  key: 'socialmediaposting_edit_post',
  name: 'Edit Social Post',
  description:
    'Edit a social post with an explicit publication state. Omitted optional fields are not sent.',
  constraints: publishingConstraints,
  tags: { readOnly: false, destructive: true }
})
  .scopes(highLevelScope('socialplanner/post.write'))
  .input(socialPostInputSchema.extend({ id: postId }))
  .output(postOutputSchema)
  .handleInvocation(async ctx => {
    const { id, ...fields } = ctx.input;
    validatePost(fields);
    const userId = fields.userId ?? ctx.auth.userId;
    if (!userId) {
      throw createApiServiceError(
        'Provide userId for the HighLevel user managing this social post, including drafts. Ask your sub-account administrator for an existing user identifier.'
      );
    }
    const client = createHighLevelClient(ctx.auth);
    const response = await client.request<unknown>({
      method: 'PUT',
      path: `/social-media-posting/${encodeURIComponent(client.locationId)}/posts/${encodeURIComponent(id)}`,
      scope: 'socialplanner/post.write',
      body: pickDefined({ ...fields, userId })
    });
    return {
      output: readPost(response, client.locationId),
      message:
        'HighLevel accepted the social post update. Read back its state to check publishing results.'
    };
  })
  .build();

export const socialTools = [
  socialGetAccount,
  socialGetStatistics,
  socialCreatePost,
  socialGetPost,
  socialGetPosts,
  socialEditPost
];
