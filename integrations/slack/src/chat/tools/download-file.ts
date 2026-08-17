import { downloadFile as contract } from '@slates/adapter-chat';
import { SlackClient } from '../../lib/client';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { mapSlackFile } from '../lib/mappers';

export let chatDownloadFile = contract
  .implement(spec)
  .scopes(slackActionScopes.filesRead)
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let id = ctx.input.id ?? ctx.input.fetchMetadata?.fileId;
    let file = id ? await client.getFileInfo(id) : undefined;
    let url = ctx.input.url ?? file?.url_private_download ?? file?.url_private;
    if (!url) throw new Error('A Slack file id or private download URL is required');
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
      throw new Error('Slack file downloads require an official HTTPS Slack file URL');
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
