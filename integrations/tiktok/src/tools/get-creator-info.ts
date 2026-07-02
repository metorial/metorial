import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TikTokConsumerClient } from '../lib/client';
import { spec } from '../spec';

export let getCreatorInfo = SlateTool.create(spec, {
  name: 'Get Creator Info',
  key: 'get_creator_info',
  description: `Retrieve the authenticated creator's posting capabilities and constraints. Returns available privacy level options, interaction settings (comments, duet, stitch), and maximum video duration. **Must be called before posting content** to determine valid settings.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      creatorAvatarUrl: z
        .string()
        .optional()
        .describe('Creator avatar URL (expires in ~2 hours).'),
      creatorUsername: z.string().optional().describe('Unique creator username.'),
      creatorNickname: z.string().optional().describe('Creator display name.'),
      privacyLevelOptions: z
        .array(z.string())
        .optional()
        .describe(
          'Available privacy levels for posting (e.g. PUBLIC_TO_EVERYONE, SELF_ONLY).'
        ),
      commentDisabled: z
        .boolean()
        .optional()
        .describe('Whether comments are disabled for this creator.'),
      duetDisabled: z
        .boolean()
        .optional()
        .describe('Whether duets are disabled for this creator.'),
      stitchDisabled: z
        .boolean()
        .optional()
        .describe('Whether stitches are disabled for this creator.'),
      maxVideoPostDurationSec: z
        .number()
        .optional()
        .describe('Maximum allowed video duration in seconds.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TikTokConsumerClient({ token: ctx.auth.token });
    let info = await client.queryCreatorInfo();

    return {
      output: {
        creatorAvatarUrl: info.creator_avatar_url,
        creatorUsername: info.creator_username,
        creatorNickname: info.creator_nickname,
        privacyLevelOptions: info.privacy_level_options,
        commentDisabled: info.comment_disabled,
        duetDisabled: info.duet_disabled,
        stitchDisabled: info.stitch_disabled,
        maxVideoPostDurationSec: info.max_video_post_duration_sec
      },
      message: `Creator **${info.creator_nickname ?? info.creator_username ?? 'unknown'}** can post with privacy levels: ${(info.privacy_level_options ?? []).join(', ')}.`
    };
  })
  .build();
