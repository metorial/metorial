import {
  ATTACHMENT_SOURCE_TIMEOUT_MS,
  attachmentTypeForMime,
  ChatError,
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

let MAX_REDIRECTS = 3;

// Each redirect must stay on an official SharePoint host.
let fetchOneDriveFile = async (start: URL) => {
  let signal = AbortSignal.timeout(ATTACHMENT_SOURCE_TIMEOUT_MS);
  let url = start;
  for (let hop = 0; ; hop++) {
    let response = await fetch(url, { signal, redirect: 'manual' });
    if (response.status < 300 || response.status >= 400) return response;
    response.body?.cancel().catch(() => undefined);
    let location = response.headers.get('location');
    let next = location ? new URL(location, url) : undefined;
    if (
      hop >= MAX_REDIRECTS ||
      !next ||
      next.protocol !== 'https:' ||
      !isAllowedHost(next.hostname, 'download_info')
    ) {
      throw ChatErrors.attachmentDownloadFailed({
        action: contract.key,
        retryable: false,
        message: 'The Teams file link redirected outside Microsoft file storage.'
      });
    }
    url = next;
  }
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

    let mimeType = reference.contentType;
    if (reference.kind === 'content_url') {
      // Stable Bot Connector endpoint; the hub fetches it with the current bot token.
      let identity = requireTeamsBotIdentity(ctx.auth, action);
      await ctx.addAttachment({
        type: 'url',
        url: url.toString(),
        mimeType,
        headers: { Authorization: `Bearer ${identity.token}` }
      });
    } else {
      // The pre-authenticated OneDrive link lasts minutes and bot credentials cannot reissue it.
      let response: Response;
      try {
        response = await fetchOneDriveFile(url);
      } catch (error) {
        if (ChatError.is(error)) throw error;
        throw ChatErrors.attachmentDownloadFailed({
          action,
          attachmentId: reference.uniqueId,
          message: 'Could not download the Teams file.',
          cause: error
        });
      }
      if (!response.ok) {
        response.body?.cancel().catch(() => undefined);
        throw ChatErrors.attachmentDownloadFailed({
          action,
          attachmentId: reference.uniqueId,
          retryable: false,
          message: `Teams returned HTTP ${response.status} for the file link; it may have expired. Ask the sender to share the file again.`
        });
      }
      let responseType = response.headers.get('content-type')?.split(';')[0]?.trim();
      if (responseType && responseType !== 'application/octet-stream') {
        mimeType ??= responseType;
      }
      await ctx.addAttachment({
        type: 'content',
        content: response,
        mimeType,
        filename: reference.name
      });
    }

    return {
      output: {
        attachment: {
          type: attachmentTypeForMime(mimeType),
          ...(reference.uniqueId ? { id: reference.uniqueId } : {}),
          ...(reference.name ? { name: reference.name } : {}),
          ...(mimeType ? { mimeType } : {}),
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
