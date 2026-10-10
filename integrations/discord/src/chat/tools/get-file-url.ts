import { getFileUrlTool } from '@slates/provider';
import { spec } from '../../spec';
import { DiscordChatClient } from '../lib/client';
import { withDiscordChatErrors } from '../lib/errors';
import { parseDiscordFileReference, resolveDiscordAttachment } from '../lib/files';

let ACTION = 'metorial$getFileUrl';

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
      // The hub reissues at `expiresAt`, so it carries the renewal margin.
      return { url: resolved.url, expiresAt: resolved.refreshAt };
    }
  )
);
