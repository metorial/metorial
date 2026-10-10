import { getFileUrlTool } from '@slates/provider';
import { spec } from '../../spec';
import { DiscordChatClient } from '../lib/client';
import { withDiscordChatErrors } from '../lib/errors';
import { parseDiscordFileReference, resolveDiscordAttachment } from '../lib/files';

let ACTION = 'metorial$getFileUrl';
let FALLBACK_TTL_MS = 60 * 60 * 1000;

export let discordGetFileUrl = getFileUrlTool(spec, async ctx =>
  withDiscordChatErrors(
    { action: ACTION, notFound: 'chat.attachment.not_found' },
    async () => {
      let reference = parseDiscordFileReference(ctx.input.reference, ACTION);
      let resolved = await resolveDiscordAttachment(
        new DiscordChatClient(ctx.auth),
        reference,
        ACTION
      );
      return {
        url: resolved.url,
        expiresAt: (resolved.expiresAt ?? new Date(Date.now() + FALLBACK_TTL_MS)).toISOString()
      };
    }
  )
);
