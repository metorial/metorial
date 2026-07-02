import { SlateTool } from 'slates';
import { z } from 'zod';
import { ToneDenClient } from '../lib/client';
import { spec } from '../spec';

let attachmentOutputSchema = z.object({
  attachmentId: z.number().describe('Unique attachment ID'),
  ownerId: z.number().optional().describe('Owner user ID'),
  type: z.string().describe('Attachment type (unlock or contest)'),
  title: z.string().optional().describe('Attachment title'),
  artworkUrl: z.string().optional().describe('Artwork URL'),
  linkPath: z.string().optional().describe('URL path for the attachment'),
  message: z.string().optional().describe('Landing page message text'),
  isPrivate: z.boolean().optional().describe('Whether the attachment is private'),
  isHidden: z.boolean().optional().describe('Whether the attachment is hidden'),
  actions: z.number().optional().describe('Number of actions/entries')
});

export let manageAttachment = SlateTool.create(spec, {
  name: 'Manage Attachment',
  key: 'manage_attachment',
  description: `Create, retrieve, update, or delete a social unlock or contest attachment.
**Social Unlocks** gate content (file downloads, coupon codes, URLs, unlisted YouTube videos) behind social actions - every fan who completes the action receives the reward.
**Contests** incentivize fans to perform social actions for a chance to win - more actions increase the chance of winning.`,
  instructions: [
    'Set attachmentType to "unlock" for social unlocks or "contest" for contests.',
    'For unlocks, also set unlockType to specify what fans receive (download, coupon, link, or stream).',
    'Supported social action platforms include: facebook, twitter, spotify, soundcloud, email, twitch, and more.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'update', 'delete']).describe('Operation to perform'),
      attachmentId: z
        .number()
        .optional()
        .describe('Attachment ID (required for get, update, delete)'),
      attachmentType: z.enum(['unlock', 'contest']).optional().describe('Type of attachment'),
      title: z.string().optional().describe('Attachment title'),
      artworkUrl: z.string().optional().describe('Artwork image URL'),
      linkPath: z.string().optional().describe('URL path for the attachment page'),
      isPrivate: z.boolean().optional().describe('Make attachment private'),
      isHidden: z.boolean().optional().describe('Hide attachment from public listings'),
      secretToken: z.string().optional().describe('Secret token for private access'),
      message: z.string().optional().describe('Primary landing page text/message'),
      unlockType: z
        .enum(['download', 'coupon', 'link', 'stream'])
        .optional()
        .describe('Reward type for unlocks'),
      downloadUrl: z.string().optional().describe('Download URL for download unlock type'),
      unlockText: z
        .string()
        .optional()
        .describe('Text shown after unlock (e.g., coupon code)'),
      streamUnlockUrl: z.string().optional().describe('URL for stream unlock type'),
      platforms: z
        .array(z.string())
        .optional()
        .describe(
          'Social action platforms (e.g., facebook, twitter, spotify, email, soundcloud, twitch, spotify-pre-save)'
        )
    })
  )
  .output(
    z.object({
      attachment: attachmentOutputSchema.optional().describe('Attachment details'),
      deleted: z.boolean().optional().describe('Whether the attachment was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ToneDenClient({ token: ctx.auth.token });
    let { action, attachmentId } = ctx.input;

    let mapAttachment = (a: any) => ({
      attachmentId: a.id,
      ownerId: a.owner_id,
      type: a.type,
      title: a.title,
      artworkUrl: a.artwork_url,
      linkPath: a.link_path,
      message: a.message,
      isPrivate: a.is_private,
      isHidden: a.is_hidden,
      actions: a.actions
    });

    if (action === 'get') {
      if (!attachmentId) throw new Error('attachmentId is required for get action');
      let attachment = await client.getAttachment(attachmentId);
      return {
        output: { attachment: mapAttachment(attachment) },
        message: `Retrieved attachment **"${attachment.title}"** (ID: ${attachment.id}, type: ${attachment.type}).`
      };
    }

    if (action === 'delete') {
      if (!attachmentId) throw new Error('attachmentId is required for delete action');
      await client.deleteAttachment(attachmentId);
      return {
        output: { deleted: true },
        message: `Deleted attachment ID **${attachmentId}**.`
      };
    }

    let data: Record<string, any> = {};
    if (ctx.input.attachmentType) data.type = ctx.input.attachmentType;
    if (ctx.input.title) data.title = ctx.input.title;
    if (ctx.input.artworkUrl) data.artwork_url = ctx.input.artworkUrl;
    if (ctx.input.linkPath) data.link_path = ctx.input.linkPath;
    if (ctx.input.isPrivate !== undefined) data.is_private = ctx.input.isPrivate;
    if (ctx.input.isHidden !== undefined) data.is_hidden = ctx.input.isHidden;
    if (ctx.input.secretToken) data.secret_token = ctx.input.secretToken;
    if (ctx.input.message) data.message = ctx.input.message;
    if (ctx.input.unlockType) data.unlock_type = ctx.input.unlockType;
    if (ctx.input.downloadUrl) data.download_url = ctx.input.downloadUrl;
    if (ctx.input.unlockText) data.unlock_text = ctx.input.unlockText;
    if (ctx.input.streamUnlockUrl) data.stream_unlock_url = ctx.input.streamUnlockUrl;
    if (ctx.input.platforms) data.platforms = ctx.input.platforms;

    if (action === 'create') {
      let attachment = await client.createAttachment(data);
      return {
        output: { attachment: mapAttachment(attachment) },
        message: `Created ${attachment.type} **"${attachment.title}"** (ID: ${attachment.id}).`
      };
    }

    // update
    if (!attachmentId) throw new Error('attachmentId is required for update action');
    let attachment = await client.updateAttachment(attachmentId, data);
    return {
      output: { attachment: mapAttachment(attachment) },
      message: `Updated ${attachment.type} **"${attachment.title}"** (ID: ${attachment.id}).`
    };
  })
  .build();
