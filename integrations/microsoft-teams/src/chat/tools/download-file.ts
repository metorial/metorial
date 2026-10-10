import {
  attachmentTypeForMime,
  ChatErrors,
  downloadFile as contract
} from '@slates/adapter-chat';
import { BOT_FRAMEWORK_AUTH_METHOD_KEY, isTeamsServiceHost } from '../../lib/botFramework';
import { spec } from '../../spec';
import { requireTeamsBotIdentity } from '../lib/client';
import { type TeamsFileReference, teamsFileReferenceSchema } from '../lib/mappers';

// OneDrive downloadUrl needs no credential; Bot Connector contentUrl needs the bot token.
// https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-filesv4
let SHAREPOINT_HOST_SUFFIXES = ['.sharepoint.com', '.sharepoint.us', '.sharepoint-mil.us'];

let isAllowedHost = (hostname: string, kind: TeamsFileReference['kind']) => {
  let host = hostname.toLowerCase();
  if (kind === 'download_info') {
    return SHAREPOINT_HOST_SUFFIXES.some(suffix => host.endsWith(suffix));
  }
  // The bot token is only forwarded to Bot Connector hosts.
  return isTeamsServiceHost(host);
};

export let chatDownloadFile = contract
  .implement(spec)
  .authMethods([BOT_FRAMEWORK_AUTH_METHOD_KEY])
  .handleInvocation(async ctx => {
    let action = contract.key;
    let parsed = teamsFileReferenceSchema.safeParse(ctx.input.providerFileReference);
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
          type: attachmentTypeForMime(reference.contentType),
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
