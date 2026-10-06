import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { FilesClient } from '../lib/client';
import { botIdSchema, resolveBotId } from '../lib/schemas';
import { spec } from '../spec';
import { fileUrlExpiry } from './get-file-url';

export let manageFilesTool = SlateTool.create(spec, {
  name: 'Manage Files',
  key: 'manage_files',
  description: `List, retrieve, download, delete, or search files in a bot's file storage. Use search for indexed knowledge files. Upsert creates or updates file metadata and can upload UTF-8 text content. Call list_workspaces to discover workspace IDs, then list_bots to discover bot IDs.`,
  instructions: [
    'For upsert, provide content to upload UTF-8 text immediately, or provide size and upload bytes with PUT to the returned uploadUrl.',
    'For get, set download to true to prepare the file for download.',
    'Set index to true when upserting files that should be searchable via semantic search.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'delete', 'search', 'upsert'])
        .describe('Operation to perform'),
      botId: botIdSchema,
      fileId: z.string().optional().describe('File ID (required for get, delete)'),
      key: z
        .string()
        .optional()
        .describe('Unique file key within the bot (required for upsert)'),
      size: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe(
          'File size in bytes. Required for upsert when content is omitted; otherwise calculated from the UTF-8 content.'
        ),
      content: z.string().optional().describe('UTF-8 text content to upload during upsert.'),
      contentType: z.string().optional().describe('MIME type for upsert, such as text/plain.'),
      download: z
        .boolean()
        .optional()
        .describe('For get, prepare the retrieved file for download.'),
      index: z
        .boolean()
        .optional()
        .describe('Whether to index the file for semantic search (upsert)'),
      accessPolicies: z
        .array(z.string())
        .optional()
        .describe('Access policies, e.g. ["public_content", "integrations"] (upsert)'),
      fileTags: z
        .record(z.string(), z.string())
        .optional()
        .describe('Tags for the file (upsert)'),
      searchQuery: z
        .string()
        .optional()
        .describe('Natural language search query (required for search action)'),
      searchLimit: z.number().int().min(1).optional().describe('Max results for search'),
      nextToken: z.string().optional().describe('Pagination token for list'),
      sortField: z
        .string()
        .optional()
        .describe('Sort field for list (key, size, createdAt, updatedAt, status)'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction for list')
    })
  )
  .output(
    z.object({
      file: z
        .object({
          fileId: z.string(),
          key: z.string().optional(),
          url: z.string().optional(),
          uploadUrl: z.string().optional(),
          size: z.number().optional(),
          contentType: z.string().optional(),
          status: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
        .optional(),
      files: z
        .array(
          z.object({
            fileId: z.string(),
            key: z.string().optional(),
            url: z.string().optional(),
            size: z.number().optional(),
            status: z.string().optional(),
            contentType: z.string().optional()
          })
        )
        .optional(),
      passages: z
        .array(
          z.object({
            content: z.string(),
            score: z.number().optional(),
            fileKey: z.string().optional(),
            fileId: z.string().optional()
          })
        )
        .optional(),
      nextToken: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let botId = resolveBotId(ctx.input.botId, ctx.config);

    let client = new FilesClient({ token: ctx.auth.token, botId });

    if (ctx.input.action === 'list') {
      let result = await client.listFiles({
        nextToken: ctx.input.nextToken,
        sortField: ctx.input.sortField,
        sortDirection: ctx.input.sortDirection
      });
      let files = (result.files || []).map((f: Record<string, unknown>) => ({
        fileId: f.id as string,
        key: f.key as string | undefined,
        url: f.url as string | undefined,
        size: (f.size ?? undefined) as number | undefined,
        status: f.status as string | undefined,
        contentType: f.contentType as string | undefined
      }));
      return {
        output: { files, nextToken: result.meta?.nextToken },
        message: `Found **${files.length}** file(s).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.fileId) throw createApiServiceError('fileId is required for get action');
      let result = await client.getFile(ctx.input.fileId);
      let f = result.file;
      if (ctx.input.download) {
        if (!f.url)
          throw createApiServiceError('Botpress did not return a download URL for this file.');
        if (f.status === 'upload_pending' || f.status === 'upload_failed')
          throw createApiServiceError(
            'The file has not uploaded successfully. Upload its content before downloading.'
          );
        const isPublic = f.accessPolicies?.includes('public_content');
        await ctx.addAttachment({
          type: 'url',
          url: f.url,
          mimeType: f.contentType,
          ...(isPublic
            ? {}
            : { refreshReference: { botId, fileId: f.id }, refreshAt: fileUrlExpiry(f.url) })
        });
      }
      return {
        output: {
          file: {
            fileId: f.id,
            key: f.key,
            url: f.url,
            size: f.size ?? undefined,
            contentType: f.contentType,
            status: f.status,
            createdAt: f.createdAt,
            updatedAt: f.updatedAt
          }
        },
        message: `Retrieved file **${f.key || f.id}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.fileId)
        throw createApiServiceError('fileId is required for delete action');
      await client.deleteFile(ctx.input.fileId);
      return {
        output: { deleted: true },
        message: `Deleted file **${ctx.input.fileId}**.`
      };
    }

    if (ctx.input.action === 'search') {
      if (!ctx.input.searchQuery)
        throw createApiServiceError('searchQuery is required for search action');
      let result = await client.searchFiles(ctx.input.searchQuery, {
        limit: ctx.input.searchLimit
      });
      let passages = (result.passages || []).map((p: Record<string, unknown>) => ({
        content: (p.content || '') as string,
        score: p.score as number | undefined,
        fileKey: (p.file as Record<string, unknown>)?.key as string | undefined,
        fileId: (p.file as Record<string, unknown>)?.id as string | undefined
      }));
      return {
        output: { passages },
        message: `Found **${passages.length}** passage(s) matching "${ctx.input.searchQuery}".`
      };
    }

    if (ctx.input.action === 'upsert') {
      if (!ctx.input.key) throw createApiServiceError('key is required for upsert action');
      const contentSize =
        ctx.input.content === undefined
          ? undefined
          : Buffer.byteLength(ctx.input.content, 'utf8');
      const size = ctx.input.size ?? contentSize;
      if (size === undefined)
        throw createApiServiceError('size is required for upsert when content is omitted.');
      if (contentSize !== undefined && size !== contentSize)
        throw createApiServiceError(
          'size must match the UTF-8 byte length of content, or omit size to calculate it automatically.'
        );
      if (
        ctx.input.accessPolicies?.some(
          policy => !['integrations', 'public_content'].includes(policy)
        )
      )
        throw createApiServiceError(
          'accessPolicies only supports integrations and public_content.'
        );
      let result = await client.upsertFile({
        key: ctx.input.key,
        size,
        index: ctx.input.index,
        tags: ctx.input.fileTags,
        accessPolicies: ctx.input.accessPolicies,
        contentType: ctx.input.contentType
      });
      let f = result.file;
      if (ctx.input.content !== undefined) {
        if (!f.uploadUrl)
          throw createApiServiceError('Botpress did not return an upload URL.');
        await client.uploadContent(
          f.uploadUrl,
          ctx.input.content,
          ctx.input.contentType ?? 'text/plain; charset=utf-8'
        );
      }
      return {
        output: {
          file: {
            fileId: f.id,
            key: ctx.input.key,
            url: f.url,
            uploadUrl: f.uploadUrl,
            size,
            contentType: f.contentType,
            status: f.status
          }
        },
        message:
          ctx.input.content === undefined
            ? `Prepared file **${ctx.input.key}**. Upload content to the returned uploadUrl.`
            : `Uploaded UTF-8 content for file **${ctx.input.key}**.`
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
