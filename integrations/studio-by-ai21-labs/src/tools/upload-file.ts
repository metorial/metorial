import {
  createApiServiceError,
  getBase64ByteLength,
  isApiErrorRecord,
  SlateTool
} from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

const MAX_FILE_BYTES = 5_000_000;
const mimeTypes: Record<string, string> = {
  txt: 'text/plain',
  md: 'text/markdown',
  html: 'text/html',
  htm: 'text/html',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};
export const uploadFile = SlateTool.create(spec, {
  name: 'Upload Library File',
  key: 'upload_file',
  description:
    'Upload a TXT, Markdown, HTML, PDF, or DOCX document to the AI21 file library for retrieval. Supply UTF-8 text or base64-encoded file bytes. Processing is asynchronous; use get_file to check status before querying it.',
  constraints: ['Files must be no larger than 5 MB.'],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      fileName: z
        .string()
        .min(1)
        .describe('Unique file name with a supported extension, such as notes.txt'),
      content: z
        .string()
        .optional()
        .describe('UTF-8 file text; provide exactly one of content or contentBase64'),
      contentBase64: z
        .string()
        .optional()
        .describe('Base64-encoded file bytes; provide exactly one content source'),
      path: z.string().optional().describe('Optional file path within the library'),
      labels: z
        .array(z.string())
        .optional()
        .describe('Labels to organize and filter the document'),
      publicUrl: z
        .string()
        .optional()
        .describe('Optional source URL metadata; this does not replace the uploaded bytes')
    })
  )
  .output(
    z.object({
      fileId: z
        .string()
        .describe(
          'Uploaded file ID, usable by get_file, update_file, download_file, or delete_file'
        ),
      name: z.string().describe('Uploaded file name'),
      sizeBytes: z.number().describe('Uploaded size in bytes')
    })
  )
  .handleInvocation(async ctx => {
    if ((ctx.input.content === undefined) === (ctx.input.contentBase64 === undefined))
      throw createApiServiceError('Provide exactly one of content or contentBase64.');
    if (/[/\\\0]/.test(ctx.input.fileName))
      throw createApiServiceError(
        'Provide a file name without path separators; use path for the library path.'
      );
    const extension = ctx.input.fileName.split('.').pop()?.toLowerCase() ?? '';
    const mimeType = mimeTypes[extension];
    if (!mimeType)
      throw createApiServiceError('Use a TXT, Markdown, HTML, PDF, or DOCX file name.');
    let content: Buffer;
    if (ctx.input.contentBase64 !== undefined) {
      const normalized = ctx.input.contentBase64.replace(/\s/g, '');
      if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(normalized))
        throw createApiServiceError('Provide valid base64-encoded file content.');
      if (getBase64ByteLength(normalized) > MAX_FILE_BYTES)
        throw createApiServiceError('The file exceeds the 5 MB upload limit.');
      content = Buffer.from(normalized, 'base64');
    } else {
      if (Buffer.byteLength(ctx.input.content ?? '', 'utf8') > MAX_FILE_BYTES)
        throw createApiServiceError('The file exceeds the 5 MB upload limit.');
      content = Buffer.from(ctx.input.content ?? '', 'utf8');
    }
    if (!content.length) throw createApiServiceError('Provide a non-empty file.');
    if (ctx.input.content !== undefined && (extension === 'pdf' || extension === 'docx'))
      throw createApiServiceError('Use contentBase64 for binary PDF or DOCX files.');
    const result = await new Client(ctx.auth).uploadFile({
      fileName: ctx.input.fileName,
      content,
      mimeType,
      path: ctx.input.path,
      labels: ctx.input.labels,
      publicUrl: ctx.input.publicUrl
    });
    const id =
      typeof result === 'string'
        ? result
        : isApiErrorRecord(result)
          ? (result.fileId ?? result.id)
          : undefined;
    if (typeof id !== 'string' || !id)
      throw createApiServiceError('AI21 Studio did not return an uploaded file ID.');
    return {
      output: { fileId: id, name: ctx.input.fileName, sizeBytes: content.length },
      message: `Uploaded **${ctx.input.fileName}**. Check get_file before using it for retrieval.`
    };
  })
  .build();
