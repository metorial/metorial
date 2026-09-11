import { ChatErrors, downloadFile as contract } from '@slates/adapter-chat';
import { z } from 'zod';
import { slackActionScopes } from '../../lib/scopes';
import { spec } from '../../spec';
import { createSlackChatClient } from '../lib/client';
import { mapSlackFile } from '../lib/mappers';

let SLACK_MAX_PROXIED_ATTACHMENT_BYTES = 500 * 1024 * 1024;

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

    if (file?.size !== undefined && file.size > SLACK_MAX_PROXIED_ATTACHMENT_BYTES) {
      throw ChatErrors.attachmentTooLarge({
        action: contract.key,
        id: fileId,
        max: SLACK_MAX_PROXIED_ATTACHMENT_BYTES,
        actual: file.size
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

    let mimeType = file?.mimetype;
    let attachment = {
      ...(file
        ? mapSlackFile(file)
        : {
            type: 'file' as const,
            providerFileReference: { fileId, url }
          }),
      mimeType
    };

    await ctx.addAttachment({
      type: 'url',
      url,
      mimeType,
      headers: { Authorization: `Bearer ${ctx.auth.token}` }
    });

    return {
      output: { attachment, raw: file ?? { url } },
      message: fileId
        ? `Prepared Slack file \`${fileId}\` for download.`
        : 'Prepared Slack file for download.'
    };
  })
  .build();
