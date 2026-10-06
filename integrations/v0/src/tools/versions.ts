import { SlateTool } from 'slates';
import { z } from 'zod';
import { V0Client } from '../lib/client';
import type { Version } from '../lib/types';
import { spec } from '../spec';

const versionSchema = z.object({
  versionId: z.string(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  demoUrl: z.string().optional(),
  screenshotUrl: z.string().optional()
});
const mapVersion = (value: Version) => ({
  versionId: value.id,
  status: value.status,
  createdAt: value.createdAt,
  updatedAt: value.updatedAt,
  demoUrl: value.demoUrl,
  screenshotUrl: value.screenshotUrl
});
const chatInput = z.object({ chatId: z.string().min(1).describe('Existing API v1 chat ID') });
const versionInput = chatInput.extend({
  versionId: z.string().min(1).describe('Version ID from the chat or list_chat_versions')
});
export const listChatVersionsTool = SlateTool.create(spec, {
  name: 'List Chat Versions',
  key: 'list_chat_versions',
  description:
    'Discover versions of an existing v0 API v1 chat for backup, download, or migration to a current chat.',
  tags: { readOnly: true }
})
  .input(
    chatInput.extend({
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum versions from 1 to 100'),
      cursor: z.string().optional().describe('Pagination cursor from the previous result')
    })
  )
  .output(
    z.object({
      versions: z.array(versionSchema),
      hasMore: z.boolean(),
      nextCursor: z.string().optional(),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    const { chatId, ...query } = ctx.input;
    const result = await new V0Client(ctx.auth.token).listVersions(chatId, query);
    return {
      output: {
        versions: result.data.map(mapVersion),
        hasMore: result.pagination.hasMore,
        nextCursor: result.pagination.nextCursor,
        totalCount: result.meta?.totalCount
      },
      message: 'Retrieved chat versions.'
    };
  })
  .build();
export const getChatVersionTool = SlateTool.create(spec, {
  name: 'Get Chat Version',
  key: 'get_chat_version',
  description:
    'Inspect status and source file names of an existing v0 API v1 chat version. Use download_chat_version to retrieve its source files.',
  tags: { readOnly: true }
})
  .input(versionInput)
  .output(
    versionSchema.extend({
      files: z.array(z.object({ name: z.string(), locked: z.boolean() }))
    })
  )
  .handleInvocation(async ctx => {
    const result = await new V0Client(ctx.auth.token).getVersion(
      ctx.input.chatId,
      ctx.input.versionId
    );
    return {
      output: {
        ...mapVersion(result),
        files: (result.files ?? []).map(file => ({ name: file.name, locked: file.locked }))
      },
      message: 'Retrieved version details.'
    };
  })
  .build();
export const downloadChatVersionTool = SlateTool.create(spec, {
  name: 'Download Chat Version',
  key: 'download_chat_version',
  description:
    'Download source files from an existing v0 API v1 chat version as a ZIP or tarball archive. Useful for backups or migration.',
  tags: { readOnly: true }
})
  .input(
    versionInput.extend({
      format: z.enum(['zip', 'tarball']).optional().describe('Defaults to ZIP'),
      includeDefaultFiles: z
        .boolean()
        .optional()
        .describe('Include package.json and default configuration files')
    })
  )
  .output(
    z.object({
      chatId: z.string(),
      versionId: z.string(),
      fileName: z.string(),
      mimeType: z.string()
    })
  )
  .handleInvocation(async ctx => {
    await new V0Client(ctx.auth.token).getVersion(ctx.input.chatId, ctx.input.versionId);
    const format = ctx.input.format ?? 'zip';
    const mimeType = format === 'zip' ? 'application/zip' : 'application/gzip';
    const fileName = `v0-${ctx.input.versionId.replace(/[^a-zA-Z0-9_-]/g, '_')}.${format === 'zip' ? 'zip' : 'tar.gz'}`;
    await ctx.addAttachment({
      type: 'url',
      url: `https://api.v0.dev/v1/chats/${encodeURIComponent(ctx.input.chatId)}/versions/${encodeURIComponent(ctx.input.versionId)}/download`,
      headers: { Authorization: `Bearer ${ctx.auth.token}` },
      query: { format, includeDefaultFiles: String(ctx.input.includeDefaultFiles ?? false) },
      mimeType,
      filename: fileName
    });
    return {
      output: { chatId: ctx.input.chatId, versionId: ctx.input.versionId, fileName, mimeType },
      message: 'Prepared the version archive for download.'
    };
  })
  .build();
export const versionTools = [
  listChatVersionsTool,
  getChatVersionTool,
  downloadChatVersionTool
];
