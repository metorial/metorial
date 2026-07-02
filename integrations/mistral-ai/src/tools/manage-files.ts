import { Buffer } from 'node:buffer';
import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { MistralClient } from '../lib/client';
import { mistralServiceError } from '../lib/errors';
import { spec } from '../spec';

let fileSchema = z.object({
  fileId: z.string().describe('Unique file identifier'),
  filename: z.string().optional().describe('Original filename'),
  bytes: z.number().optional().describe('File size in bytes'),
  purpose: z.string().optional().describe('File purpose (fine-tune, batch, ocr)'),
  createdAt: z.number().optional().describe('Creation timestamp'),
  mimetype: z.string().optional().describe('File MIME type'),
  sampleType: z.string().optional().describe('Sample type'),
  source: z.string().optional().describe('File source'),
  numLines: z.number().nullable().optional().describe('Number of lines for JSONL files'),
  expiresAt: z.number().nullable().optional().describe('Expiration timestamp'),
  visibility: z.string().nullable().optional().describe('File visibility')
});

let mapFile = (f: any) => ({
  fileId: f.id,
  filename: f.filename,
  bytes: f.bytes,
  purpose: f.purpose,
  createdAt: f.created_at,
  mimetype: f.mimetype,
  sampleType: f.sample_type,
  source: f.source,
  numLines: f.num_lines,
  expiresAt: f.expires_at,
  visibility: f.visibility
});

let decodeBase64 = (contentBase64: string) => {
  let normalized = contentBase64.replace(/\s+/g, '');
  let buffer = Buffer.from(normalized, 'base64');
  let encoded = buffer.toString('base64').replace(/=+$/u, '');
  let input = normalized.replace(/=+$/u, '');

  if (!normalized || encoded !== input) {
    throw mistralServiceError('contentBase64 must be valid non-empty base64 data');
  }

  return buffer;
};

let uploadContentBase64 = (input: { content?: string; contentBase64?: string }) => {
  if (input.content && input.contentBase64) {
    throw mistralServiceError('Provide only one of content or contentBase64');
  }

  if (input.content !== undefined) {
    return Buffer.from(input.content, 'utf8').toString('base64');
  }

  if (input.contentBase64 !== undefined) {
    decodeBase64(input.contentBase64);
    return input.contentBase64;
  }

  throw mistralServiceError('Provide content or contentBase64');
};

export let uploadFileTool = SlateTool.create(spec, {
  name: 'Upload File',
  key: 'upload_file',
  description: `Upload a file to Mistral AI for OCR, batch inference, fine-tuning datasets, or later transcription by file ID. Accepts plain text content or base64-encoded bytes.`,
  instructions: [
    'Provide exactly one of content or contentBase64.',
    'purpose is optional; use "batch" for batch JSONL files, "ocr" for OCR documents, and "fine-tune" for fine-tuning JSONL datasets.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      filename: z.string().describe('Filename to assign in Mistral AI'),
      content: z.string().optional().describe('Text file content to upload'),
      contentBase64: z.string().optional().describe('Base64-encoded file bytes to upload'),
      mimeType: z
        .string()
        .optional()
        .describe('MIME type for the uploaded file, defaults to application/octet-stream'),
      purpose: z
        .enum(['fine-tune', 'batch', 'ocr'])
        .optional()
        .describe('Intended file purpose'),
      visibility: z
        .enum(['workspace', 'user'])
        .optional()
        .describe('File visibility, defaults to workspace'),
      expiry: z.number().optional().describe('Optional expiration in hours')
    })
  )
  .output(fileSchema)
  .handleInvocation(async ctx => {
    let client = new MistralClient(ctx.auth.token);
    let result = await client.uploadFile({
      filename: ctx.input.filename,
      contentBase64: uploadContentBase64(ctx.input),
      mimeType: ctx.input.mimeType,
      purpose: ctx.input.purpose,
      visibility: ctx.input.visibility,
      expiry: ctx.input.expiry
    });
    let file = mapFile(result);

    return {
      output: file,
      message: `Uploaded file **${file.filename ?? ctx.input.filename}** (${file.fileId}).`
    };
  })
  .build();

export let listFilesTool = SlateTool.create(spec, {
  name: 'List Files',
  key: 'list_files',
  description: `List files uploaded to the Mistral AI platform. Files are used for fine-tuning datasets, batch inference inputs, and OCR processing.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (0-based)'),
      pageSize: z.number().optional().describe('Number of files per page'),
      includeTotal: z.boolean().optional().describe('Whether to include total count'),
      sampleType: z
        .array(
          z.enum(['pretrain', 'instruct', 'batch_request', 'batch_result', 'batch_error'])
        )
        .optional()
        .describe('Filter by sample type'),
      source: z
        .array(z.enum(['upload', 'repository', 'mistral']))
        .optional()
        .describe('Filter by file source'),
      search: z.string().optional().describe('Search by filename'),
      purpose: z
        .enum(['fine-tune', 'batch', 'ocr'])
        .optional()
        .describe('Filter by file purpose'),
      mimetypes: z.array(z.string()).optional().describe('Filter by MIME types')
    })
  )
  .output(
    z.object({
      files: z.array(fileSchema).describe('Uploaded files'),
      total: z.number().optional().describe('Total number of files')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MistralClient(ctx.auth.token);

    let result = await client.listFiles({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      includeTotal: ctx.input.includeTotal,
      sampleType: ctx.input.sampleType,
      source: ctx.input.source,
      search: ctx.input.search,
      purpose: ctx.input.purpose,
      mimetypes: ctx.input.mimetypes
    });

    let files = (result.data || []).map(mapFile);

    return {
      output: {
        files,
        total: result.total
      },
      message: `Found **${files.length}** file(s).`
    };
  })
  .build();

export let getFileTool = SlateTool.create(spec, {
  name: 'Get File',
  key: 'get_file',
  description: `Retrieve metadata and a signed download URL for a file uploaded to Mistral AI.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileId: z.string().describe('ID of the file to retrieve')
    })
  )
  .output(
    fileSchema.extend({
      downloadUrl: z.string().optional().describe('Signed download URL (valid for 24 hours)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MistralClient(ctx.auth.token);

    let file = await client.getFile(ctx.input.fileId);
    let urlResult = await client.getFileUrl(ctx.input.fileId);

    return {
      output: {
        ...mapFile(file),
        downloadUrl: urlResult?.url
      },
      message: `Retrieved file **${file.filename || file.id}** (${file.bytes ? `${Math.round(file.bytes / 1024)} KB` : 'unknown size'}).`
    };
  })
  .build();

export let downloadFileTool = SlateTool.create(spec, {
  name: 'Download File',
  key: 'download_file',
  description: `Download file content from Mistral AI and return it as a Slate attachment. Use this for batch output/error files, uploaded documents, or other downloadable files.`,
  instructions: [
    'The file bytes are returned in response attachments, not inline output fields.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileId: z.string().describe('ID of the file to download')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('ID of the downloaded file'),
      byteLength: z.number().describe('Byte length of the downloaded file'),
      mimeType: z.string().optional().describe('Content-Type from Mistral AI')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MistralClient(ctx.auth.token);
    let result = await client.downloadFile(ctx.input.fileId);

    return {
      output: {
        fileId: ctx.input.fileId,
        byteLength: result.byteLength,
        mimeType: result.contentType
      },
      attachments: [createBase64Attachment(result.contentBase64, result.contentType)],
      message: `Downloaded file **${ctx.input.fileId}** (${result.byteLength} bytes).`
    };
  })
  .build();

export let deleteFileTool = SlateTool.create(spec, {
  name: 'Delete File',
  key: 'delete_file',
  description: `Delete a file from the Mistral AI platform. This permanently removes the file and cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      fileId: z.string().describe('ID of the file to delete')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('ID of the deleted file'),
      deleted: z.boolean().describe('Whether the file was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MistralClient(ctx.auth.token);

    let result = await client.deleteFile(ctx.input.fileId);

    return {
      output: {
        fileId: result.id,
        deleted: result.deleted === true
      },
      message: `Deleted file **${result.id}**.`
    };
  })
  .build();
