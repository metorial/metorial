import { SlateTool } from 'slates';
import { z } from 'zod';
import { MistralClient } from '../lib/client';
import { spec } from '../spec';

let fileSchema = z.object({
  fileId: z.string().describe('Unique file identifier'),
  filename: z.string().optional().describe('Original filename'),
  bytes: z.number().optional().describe('File size in bytes'),
  purpose: z.string().optional().describe('File purpose (fine-tune, batch, ocr)'),
  createdAt: z.number().optional().describe('Creation timestamp'),
  mimetype: z.string().optional().describe('File MIME type')
});

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
      pageSize: z.number().optional().describe('Number of files per page')
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
      pageSize: ctx.input.pageSize
    });

    let files = (result.data || []).map((f: any) => ({
      fileId: f.id,
      filename: f.filename,
      bytes: f.bytes,
      purpose: f.purpose,
      createdAt: f.created_at,
      mimetype: f.mimetype
    }));

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
    z.object({
      fileId: z.string().describe('File identifier'),
      filename: z.string().optional().describe('Original filename'),
      bytes: z.number().optional().describe('File size in bytes'),
      purpose: z.string().optional().describe('File purpose'),
      createdAt: z.number().optional().describe('Creation timestamp'),
      mimetype: z.string().optional().describe('File MIME type'),
      downloadUrl: z.string().optional().describe('Signed download URL (valid for 24 hours)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MistralClient(ctx.auth.token);

    let file = await client.getFile(ctx.input.fileId);
    let urlResult = await client.getFileUrl(ctx.input.fileId);

    return {
      output: {
        fileId: file.id,
        filename: file.filename,
        bytes: file.bytes,
        purpose: file.purpose,
        createdAt: file.created_at,
        mimetype: file.mimetype,
        downloadUrl: urlResult?.url
      },
      message: `Retrieved file **${file.filename || file.id}** (${file.bytes ? `${Math.round(file.bytes / 1024)} KB` : 'unknown size'}).`
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
