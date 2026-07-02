import { SlateTool } from 'slates';
import { z } from 'zod';
import { FilesClient } from '../lib/client';
import { spec } from '../spec';

export let manageFilesTool = SlateTool.create(spec, {
  name: 'Manage Files',
  key: 'manage_files',
  description: `List, retrieve, delete, or search files in a bot's file storage. Use **search** for semantic/RAG search across indexed knowledge base files. Use **upsert** to create or update file metadata (returns an upload URL for content upload).`,
  instructions: [
    'The upsert action creates file metadata and returns an uploadUrl. Upload actual file content by making a PUT request to that URL separately.',
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
      botId: z.string().optional().describe('Bot ID. Falls back to config botId.'),
      fileId: z.string().optional().describe('File ID (required for get, delete)'),
      key: z
        .string()
        .optional()
        .describe('Unique file key within the bot (required for upsert)'),
      size: z.number().optional().describe('File size in bytes (required for upsert)'),
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
      searchLimit: z.number().optional().describe('Max results for search'),
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
    let botId = ctx.input.botId || ctx.config.botId;
    if (!botId) throw new Error('botId is required (provide in input or config)');

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
        size: f.size as number | undefined,
        status: f.status as string | undefined,
        contentType: f.contentType as string | undefined
      }));
      return {
        output: { files, nextToken: result.meta?.nextToken },
        message: `Found **${files.length}** file(s).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.fileId) throw new Error('fileId is required for get action');
      let result = await client.getFile(ctx.input.fileId);
      let f = result.file;
      return {
        output: {
          file: {
            fileId: f.id,
            key: f.key,
            url: f.url,
            size: f.size,
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
      if (!ctx.input.fileId) throw new Error('fileId is required for delete action');
      await client.deleteFile(ctx.input.fileId);
      return {
        output: { deleted: true },
        message: `Deleted file **${ctx.input.fileId}**.`
      };
    }

    if (ctx.input.action === 'search') {
      if (!ctx.input.searchQuery) throw new Error('searchQuery is required for search action');
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
      if (!ctx.input.key) throw new Error('key is required for upsert action');
      if (ctx.input.size === undefined) throw new Error('size is required for upsert action');
      let result = await client.upsertFile({
        key: ctx.input.key,
        size: ctx.input.size,
        index: ctx.input.index,
        tags: ctx.input.fileTags,
        accessPolicies: ctx.input.accessPolicies
      });
      let f = result.file;
      return {
        output: {
          file: {
            fileId: f.id || '',
            key: ctx.input.key,
            url: f.url,
            uploadUrl: f.uploadUrl
          }
        },
        message: `Upserted file metadata for **${ctx.input.key}**. Upload content to the returned uploadUrl.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
