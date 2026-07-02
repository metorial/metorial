import { SlateTool } from 'slates';
import { z } from 'zod';
import { DropboxClient } from '../lib/client';
import { dropboxServiceError } from '../lib/errors';
import { spec } from '../spec';

let fileRequestSchema = z.object({
  fileRequestId: z.string().describe('Unique ID of the file request'),
  title: z.string().describe('Title of the file request'),
  url: z.string().optional().describe('URL for submitting files to this request'),
  destination: z.string().optional().describe('Destination folder path'),
  isOpen: z.boolean().describe('Whether the file request is currently accepting submissions'),
  fileCount: z.number().optional().describe('Number of files submitted'),
  created: z.string().optional().describe('Creation timestamp'),
  deadline: z.string().optional().describe('Deadline for submissions'),
  description: z.string().optional().describe('Description shown on the file request')
});

export let manageFileRequest = SlateTool.create(spec, {
  name: 'Manage File Request',
  key: 'manage_file_request',
  description: `Create, list, update, or delete Dropbox file requests. File requests allow others to upload files to your Dropbox. Use action "create" to make a new request, "list" to see all requests, "get" for a specific request, "update" to modify, or "delete" to remove requests.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'list', 'get', 'update', 'delete'])
        .describe('Action to perform'),
      fileRequestId: z
        .string()
        .optional()
        .describe('File request ID (required for "get", "update", "delete")'),
      fileRequestIds: z
        .array(z.string())
        .optional()
        .describe('File request IDs to delete (for "delete" with multiple)'),
      cursor: z
        .string()
        .optional()
        .describe('Cursor from a previous list action to continue pagination'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of file requests to return for "list"'),
      title: z
        .string()
        .optional()
        .describe('Title for the file request (for "create" and "update")'),
      destination: z
        .string()
        .optional()
        .describe('Destination folder path (for "create" and "update")'),
      deadline: z
        .string()
        .optional()
        .nullable()
        .describe(
          'Deadline ISO timestamp. Set null to remove deadline (for "create" and "update")'
        ),
      open: z
        .boolean()
        .optional()
        .describe('Whether the file request accepts submissions (for "create" and "update")'),
      description: z
        .string()
        .optional()
        .describe('Description for the file request (for "create" and "update")')
    })
  )
  .output(
    z.object({
      fileRequest: fileRequestSchema
        .optional()
        .describe('Single file request (for "create", "get", "update")'),
      fileRequests: z
        .array(fileRequestSchema)
        .optional()
        .describe('List of file requests (for "list")'),
      cursor: z.string().optional().describe('Cursor for fetching more file requests'),
      hasMore: z.boolean().optional().describe('Whether more file requests are available'),
      deleted: z.boolean().optional().describe('Whether deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DropboxClient(ctx.auth.token);

    let mapRequest = (fr: any) => ({
      fileRequestId: fr.id,
      title: fr.title,
      url: fr.url,
      destination: fr.destination,
      isOpen: fr.is_open,
      fileCount: fr.file_count,
      created: fr.created,
      deadline: fr.deadline?.deadline,
      description: fr.description
    });

    if (ctx.input.action === 'create') {
      if (!ctx.input.title) {
        throw dropboxServiceError('title is required to create a file request.');
      }
      if (!ctx.input.destination) {
        throw dropboxServiceError('destination is required to create a file request.');
      }

      let result = await client.createFileRequest(
        ctx.input.title,
        ctx.input.destination,
        ctx.input.deadline ?? undefined,
        ctx.input.open ?? true,
        ctx.input.description
      );

      return {
        output: { fileRequest: mapRequest(result) },
        message: `Created file request **${result.title}**: ${result.url}`
      };
    }

    if (ctx.input.action === 'list') {
      let result = ctx.input.cursor
        ? await client.listFileRequestsContinue(ctx.input.cursor)
        : await client.listFileRequests(ctx.input.limit);
      let fileRequests = (result.file_requests || []).map(mapRequest);

      return {
        output: {
          fileRequests,
          cursor: result.cursor,
          hasMore: result.has_more
        },
        message: `Found **${fileRequests.length}** file requests.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.fileRequestId) {
        throw dropboxServiceError('fileRequestId is required.');
      }
      let result = await client.getFileRequest(ctx.input.fileRequestId);

      return {
        output: { fileRequest: mapRequest(result) },
        message: `Retrieved file request **${result.title}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.fileRequestId) {
        throw dropboxServiceError('fileRequestId is required.');
      }

      let result = await client.updateFileRequest(ctx.input.fileRequestId, {
        title: ctx.input.title,
        destination: ctx.input.destination,
        deadline: ctx.input.deadline,
        open: ctx.input.open,
        description: ctx.input.description
      });

      return {
        output: { fileRequest: mapRequest(result) },
        message: `Updated file request **${result.title}**.`
      };
    }

    // delete
    let ids =
      ctx.input.fileRequestIds || (ctx.input.fileRequestId ? [ctx.input.fileRequestId] : []);
    if (ids.length === 0)
      throw dropboxServiceError('At least one file request ID is required for deletion.');

    await client.deleteFileRequests(ids);
    return {
      output: { deleted: true },
      message: `Deleted **${ids.length}** file request(s).`
    };
  })
  .build();
