import { ChatErrors, downloadFile as contract } from '@slates/adapter-chat';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { createSlackChatClient } from '../lib/client';
import { mapSlackFile } from '../lib/mappers';

export let chatDownloadFile = contract
  .implement(spec)
  .scopes(slackActionScopes.filesRead)
  .handleInvocation(async ctx => {
    let client = createSlackChatClient(ctx, {
      action: contract.key,
      context: { attachmentId: ctx.input.id },
      ambiguous: { not_found: 'chat.attachment.not_found' }
    });
    let id = ctx.input.id ?? ctx.input.fetchMetadata?.fileId;
    let file = id ? await client.getFileInfo(id) : undefined;
    let url = ctx.input.url ?? file?.url_private_download ?? file?.url_private;
    if (!url) {
      throw ChatErrors.missingTarget({
        action: contract.key,
        message: 'A Slack file id or private download URL is required'
      });
    }
    let parsedUrl = new URL(url);
    if (
      parsedUrl.protocol !== 'https:' ||
      !(
        parsedUrl.hostname === 'files.slack.com' ||
        parsedUrl.hostname.endsWith('.slack.com') ||
        parsedUrl.hostname === 'slack-files.com' ||
        parsedUrl.hostname.endsWith('.slack-files.com')
      )
    ) {
      throw ChatErrors.attachmentDownloadFailed({
        action: contract.key,
        attachmentId: id,
        message: 'Slack file downloads require an official HTTPS Slack file URL',
        // A non-Slack host is a bad request, not a transient upstream failure.
        retryable: false,
        slate: { code: 'input.invalid' }
      });
    }
    let download = await client.downloadFile(url);
    let attachment = {
      ...(file ? mapSlackFile(file) : { type: 'file' as const, url }),
      content: download.content.toString('base64'),
      encoding: 'base64' as const,
      mimeType: download.contentType ?? file?.mimetype,
      size: download.contentLength,
      raw: file ?? { url }
    };
    return {
      output: { attachment, raw: file ?? { url, contentLength: download.contentLength } },
      message: `Downloaded ${download.contentLength} byte(s) from Slack.`
    };
  })
  .build();
