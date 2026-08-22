import { ChatErrors, downloadFile as contract } from '@slates/adapter-chat';
import { z } from 'zod';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { createSlackChatClient } from '../lib/client';
import { mapSlackFile } from '../lib/mappers';

let providerFileReferenceSchema = z.object({
  fileId: z.string().optional(),
  url: z.string().optional()
});

export let chatDownloadFile = contract
  .implement(spec)
  .scopes(slackActionScopes.filesRead)
  .handleInvocation(async ctx => {
    let parsedReference = providerFileReferenceSchema.safeParse(
      ctx.input.providerFileReference
    );
    if (!parsedReference.success) {
      throw ChatErrors.inputInvalid({
        action: contract.key,
        message: 'providerFileReference must include a Slack file id or private download URL'
      });
    }
    let { fileId, url: referenceUrl } = parsedReference.data;

    let client = createSlackChatClient(ctx, {
      action: contract.key,
      context: { attachmentId: fileId },
      ambiguous: { not_found: 'chat.attachment.not_found' }
    });
    let file = fileId ? await client.getFileInfo(fileId) : undefined;
    let url = referenceUrl ?? file?.url_private_download ?? file?.url_private;
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
        attachmentId: fileId,
        message: 'Slack file downloads require an official HTTPS Slack file URL',
        retryable: false,
        slate: { code: 'input.invalid' }
      });
    }

    let download = await client.downloadFile(url);
    let mimeType = download.contentType ?? file?.mimetype;
    let attachment = {
      ...(file
        ? mapSlackFile(file)
        : {
            type: 'file' as const,
            providerFileReference: { fileId, url }
          }),
      mimeType,
      size: download.contentLength
    };

    return {
      output: { attachment, raw: file ?? { url, contentLength: download.contentLength } },
      attachments: [
        {
          content: {
            type: 'content' as const,
            encoding: 'base64' as const,
            content: download.content.toString('base64')
          },
          mimeType,
          attachmentHash: fileId ? `slack:file:${fileId}` : undefined
        }
      ],
      message: `Downloaded ${download.contentLength} byte(s) from Slack.`
    };
  })
  .build();
