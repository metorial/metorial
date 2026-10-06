import { getBase64ByteLength, SlateTool } from 'slates';
import { z } from 'zod';
import { EgnyteClient } from '../lib/client';
import { invalid, record, requiredList, text } from '../lib/contracts';
import { spec } from '../spec';

export const uploadFileTool = SlateTool.create(spec, {
  name: 'Upload File',
  key: 'upload_file',
  description:
    'Upload a text or base64 file to an Egnyte folder, replacing the current content if that filename exists. This tool accepts up to 4 MiB; large and chunked uploads require the Egnyte application.'
})
  .input(
    z.object({
      folderPath: z.string().describe('Existing destination folder path'),
      filename: z.string().describe('Single filename without path separators'),
      file: z.object({
        content: z
          .string()
          .max(5592408)
          .describe('Text or strict standard base64 file content, up to 4 MiB decoded'),
        encoding: z.enum(['text', 'base64']),
        mimeType: z
          .string()
          .optional()
          .describe('File MIME type; defaults to application/octet-stream')
      })
    })
  )
  .output(
    z.object({
      groupId: z.string(),
      entryId: z.string(),
      name: z.string(),
      size: z.number().optional(),
      path: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const { file } = ctx.input;
    let content: Uint8Array;
    if (file.encoding === 'base64') {
      if (
        file.content.length % 4 !== 0 ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(file.content) ||
        Buffer.from(file.content, 'base64').toString('base64') !== file.content
      )
        throw invalid('Provide strict standard base64 without whitespace.');
      if (getBase64ByteLength(file.content) > 4 * 1024 * 1024)
        throw invalid('The decoded file exceeds 4 MiB.');
      content = Buffer.from(file.content, 'base64');
    } else content = Buffer.from(file.content, 'utf8');
    if (content.byteLength > 4 * 1024 * 1024) throw invalid('The file exceeds 4 MiB.');
    if (
      file.mimeType !== undefined &&
      !/^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/.test(file.mimeType)
    )
      throw invalid('Provide a valid MIME type.');
    const result = await new EgnyteClient(ctx.auth).uploadFile(
      ctx.input.folderPath,
      ctx.input.filename,
      content,
      file.mimeType
    );
    return {
      output: {
        groupId: text(result.group_id),
        entryId: text(result.entry_id),
        name: text(result.name),
        size: typeof result.size === 'number' ? result.size : undefined,
        path: typeof result.path === 'string' ? result.path : undefined
      },
      message: 'Uploaded the file.'
    };
  })
  .build();

export const downloadFileTool = SlateTool.create(spec, {
  name: 'Download File',
  key: 'download_file',
  description:
    'Prepare an Egnyte file for download using its persistent group ID. An optional version entry ID must belong to that file.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      fileGroupId: z.string().describe('Persistent group ID from file discovery'),
      entryId: z.string().optional().describe('Exact version entry ID belonging to that file')
    })
  )
  .output(
    z.object({
      groupId: z.string(),
      entryId: z.string().optional(),
      name: z.string(),
      size: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new EgnyteClient(ctx.auth);
    const file = await client.getFileById(
      ctx.input.fileGroupId,
      ctx.input.entryId !== undefined
    );
    if (file.is_folder !== false) throw invalid('Only files can be downloaded.');
    let version = file;
    if (ctx.input.entryId !== undefined && file.entry_id !== ctx.input.entryId) {
      const matches = requiredList(file.versions).filter(
        candidate => candidate.entry_id === ctx.input.entryId
      );
      if (matches.length !== 1)
        throw invalid('The requested version was not independently found on this file.');
      version = record(matches[0]);
    }
    const entryId = ctx.input.entryId ?? text(file.entry_id, 'current file version ID');
    await ctx.addAttachment({
      type: 'url',
      url: client.getDownloadUrl(ctx.input.fileGroupId, entryId),
      headers: { Authorization: `Bearer ${ctx.auth.token}` }
    });
    return {
      output: {
        groupId: ctx.input.fileGroupId,
        entryId,
        name: text(file.name),
        size: typeof version.size === 'number' ? version.size : undefined
      },
      message: 'The file is ready to download.'
    };
  })
  .build();
