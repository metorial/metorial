import { ChatErrors, downloadFile as contract } from '@slates/adapter-chat';
import { z } from 'zod';
import { BOT_FRAMEWORK_AUTH_METHOD_KEY, isTeamsServiceHost } from '../../lib/botFramework';
import { spec } from '../../spec';
import { requireTeamsBotIdentity } from '../lib/client';

// Files sent to the bot in personal chats carry a OneDrive `downloadUrl` that
// can be fetched directly; inline media carries a Bot Connector `contentUrl`
// that requires the bot token.
// https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4#receive-files-in-personal-chat
// https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4#fetch-inline-images-from-message
let referenceSchema = z.object({
  kind: z.enum(['download_info', 'content_url']),
  url: z.string(),
  name: z.string().optional(),
  contentType: z.string().optional(),
  uniqueId: z.string().optional()
});

let SHAREPOINT_HOST_SUFFIXES = ['.sharepoint.com', '.sharepoint.us', '.sharepoint-mil.us'];

let isAllowedHost = (hostname: string, kind: 'download_info' | 'content_url') => {
  let host = hostname.toLowerCase();
  if (kind === 'download_info') {
    return SHAREPOINT_HOST_SUFFIXES.some(suffix => host.endsWith(suffix));
  }
  // The bot token is only forwarded to Bot Connector hosts.
  return isTeamsServiceHost(host);
};

let attachmentType = (mimeType: string | undefined) => {
  if (mimeType?.startsWith('image/')) return 'image' as const;
  if (mimeType?.startsWith('video/')) return 'video' as const;
  if (mimeType?.startsWith('audio/')) return 'audio' as const;
  return 'file' as const;
};

export let chatDownloadFile = contract
  .implement(spec)
  .authMethods([BOT_FRAMEWORK_AUTH_METHOD_KEY])
  .handleInvocation(async ctx => {
    let action = contract.key;
    let parsed = referenceSchema.safeParse(ctx.input.providerFileReference);
    if (!parsed.success) {
      throw ChatErrors.inputInvalid({
        action,
        message:
          'providerFileReference must be a Teams file reference from a received message.'
      });
    }
    let reference = parsed.data;

    let url: URL;
    try {
      url = new URL(reference.url);
    } catch {
      throw ChatErrors.inputInvalid({ action, message: 'The Teams file URL is not valid.' });
    }

    if (url.protocol !== 'https:' || !isAllowedHost(url.hostname, reference.kind)) {
      throw ChatErrors.attachmentDownloadFailed({
        action,
        attachmentId: reference.uniqueId,
        message: 'Teams file downloads require an official HTTPS Microsoft file URL.',
        retryable: false,
        slate: { code: 'input.invalid' }
      });
    }

    if (reference.kind === 'content_url') {
      let identity = requireTeamsBotIdentity(ctx.auth, action);
      await ctx.addAttachment({
        type: 'url',
        url: url.toString(),
        mimeType: reference.contentType,
        headers: { Authorization: `Bearer ${identity.token}` }
      });
    } else {
      // Pre-authenticated OneDrive link; no credential is forwarded.
      await ctx.addAttachment({
        type: 'url',
        url: url.toString(),
        mimeType: reference.contentType
      });
    }

    return {
      output: {
        attachment: {
          type: attachmentType(reference.contentType),
          ...(reference.uniqueId ? { id: reference.uniqueId } : {}),
          ...(reference.name ? { name: reference.name } : {}),
          ...(reference.contentType ? { mimeType: reference.contentType } : {}),
          providerFileReference: reference,
          status: 'complete' as const,
          raw: { kind: reference.kind }
        },
        raw: { kind: reference.kind, name: reference.name ?? null }
      },
      message: reference.name
        ? `Prepared Teams file **${reference.name}** for download.`
        : 'Prepared Teams file for download.'
    };
  })
  .build();
