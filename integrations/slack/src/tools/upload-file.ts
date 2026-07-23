import { Buffer } from 'node:buffer';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { slackServiceError } from '../lib/errors';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

export const SLACK_MAX_UPLOAD_FILE_BYTES = 6 * 1024 * 1024;
export const SLACK_MAX_UPLOAD_BASE64_CHARACTERS =
  Math.ceil(SLACK_MAX_UPLOAD_FILE_BYTES / 3) * 4;

export let decodeSlackFileBase64 = (contentBase64: string) => {
  let normalized = contentBase64.trim().replace(/\s/g, '');
  if (normalized.length > SLACK_MAX_UPLOAD_BASE64_CHARACTERS) {
    throw slackServiceError('Slack base64 file uploads are limited to 6 MiB.');
  }
  if (
    !normalized ||
    normalized.length % 4 === 1 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)
  ) {
    throw slackServiceError('contentBase64 must be valid base64-encoded file bytes.');
  }

  let content = Buffer.from(normalized, 'base64');
  let canonical = content.toString('base64').replace(/=+$/, '');
  let provided = normalized.replace(/=+$/, '');
  if (content.byteLength === 0 || canonical !== provided) {
    throw slackServiceError(
      content.byteLength === 0
        ? 'contentBase64 must contain at least one decoded byte.'
        : 'contentBase64 must be valid base64-encoded file bytes.'
    );
  }
  if (content.byteLength > SLACK_MAX_UPLOAD_FILE_BYTES) {
    throw slackServiceError('Slack base64 file uploads are limited to 6 MiB.');
  }

  return content;
};

export let uploadFile = SlateTool.create(spec, {
  name: 'Upload File',
  key: 'upload_file',
  description:
    'Upload a document, image, or other binary file to Slack from base64-encoded bytes using Slack’s external upload flow. Use manage_files with action "upload" for text-snippet convenience uploads.',
  instructions: [
    'Provide the original filename, including its extension, and the correct contentType when known.',
    'Provide channelId to share the uploaded file into a conversation; omit it to upload the file without sharing it.',
    'Provide threadTs only when channelId identifies the conversation containing that thread.'
  ],
  constraints: [
    'Decoded file content must be non-empty and no larger than 6 MiB because JSON tool payloads are not suitable for large files.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(slackActionScopes.filesWrite)
  .input(
    z.object({
      contentBase64: z
        .string()
        .min(1)
        .max(SLACK_MAX_UPLOAD_BASE64_CHARACTERS)
        .describe('Base64-encoded file bytes, limited to 6 MiB decoded'),
      filename: z.string().trim().min(1).describe('Filename including its extension'),
      contentType: z
        .string()
        .trim()
        .min(1)
        .regex(/^[^\r\n]+$/)
        .optional()
        .describe('MIME content type, such as application/pdf or image/png'),
      title: z.string().trim().min(1).optional().describe('Optional Slack file title'),
      channelId: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Slack conversation ID to share the file to'),
      threadTs: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Thread timestamp to share the file in; requires channelId'),
      initialComment: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Comment to post with the shared file')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('Uploaded Slack file ID'),
      name: z.string().optional().describe('Uploaded filename'),
      title: z.string().optional().describe('Slack file title'),
      mimeType: z.string().optional().describe('Slack-reported MIME type'),
      filetype: z.string().optional().describe('Slack file type identifier'),
      size: z.number().optional().describe('Slack-reported file size in bytes'),
      byteLength: z.number().describe('Decoded upload size in bytes'),
      userId: z.string().optional().describe('User ID of the uploader'),
      permalink: z.string().optional().describe('Slack permalink to the file'),
      created: z.number().optional().describe('Unix timestamp when the file was created')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.threadTs && !ctx.input.channelId) {
      throw slackServiceError('channelId is required when threadTs is provided.');
    }
    if (ctx.input.initialComment && !ctx.input.channelId) {
      throw slackServiceError('channelId is required when initialComment is provided.');
    }

    let content = decodeSlackFileBase64(ctx.input.contentBase64);
    let client = new SlackClient(ctx.auth.token);
    let file = await client.uploadBinaryFile({
      content,
      filename: ctx.input.filename,
      contentType: ctx.input.contentType,
      title: ctx.input.title,
      channelId: ctx.input.channelId,
      threadTs: ctx.input.threadTs,
      initialComment: ctx.input.initialComment
    });

    return {
      output: {
        fileId: file.id,
        name: file.name,
        title: file.title,
        mimeType: file.mimetype,
        filetype: file.filetype,
        size: file.size,
        byteLength: content.byteLength,
        userId: file.user,
        permalink: file.permalink,
        created: file.created ?? file.timestamp
      },
      message: `Uploaded Slack file **${file.name ?? file.title ?? ctx.input.filename}** (\`${file.id}\`, ${content.byteLength} bytes).`
    };
  })
  .build();
