import { getFileUrlTool } from '@slates/provider';
import { spec } from '../../spec';
import { DiscordChatClient } from '../lib/client';
import { withDiscordChatErrors } from '../lib/errors';
import { parseDiscordFileReference, resolveDiscordAttachment } from '../lib/files';

let FALLBACK_TTL_MS = 60 * 60 * 1000;

/** Renews an expired Discord attachment download URL from its durable reference. */
export let discordGetFileUrl = getFileUrlTool(spec, async ctx =>
  withDiscordChatErrors(
    { action: 'metorial$getFileUrl', notFound: 'chat.attachment.not_found' },
    async () => {
      let reference = parseDiscordFileReference(ctx.input.reference, 'metorial$getFileUrl');
      let resolved = await resolveDiscordAttachment(
        new DiscordChatClient(ctx.auth),
        reference,
        'metorial$getFileUrl'
      );
      return {
        url: resolved.url,
        expiresAt: (resolved.expiresAt ?? new Date(Date.now() + FALLBACK_TTL_MS)).toISOString()
      };
    }
  )
);
