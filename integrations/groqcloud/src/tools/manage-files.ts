import { createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let fileOutputSchema = z.object({
  fileId: z.string().describe('File identifier'),
  filename: z.string().describe('Filename stored by Groq Cloud'),
  bytes: z.number().describe('File size in bytes'),
  purpose: z.string().describe('File purpose, such as batch or batch_output'),
  createdAt: z.number().describe('Unix timestamp when the file was created')
});

let mapFile = (file: {
  id: string;
  filename: string;
  bytes: number;
  purpose: string;
  created_at: number;
}) => ({
  fileId: file.id,
  filename: file.filename,
  bytes: file.bytes,
  purpose: file.purpose,
  createdAt: file.created_at
});

export let uploadFile = SlateTool.create(spec, {
  name: 'Upload File',
  key: 'upload_file',
  description: `Upload a JSONL file to Groq Cloud for Batch API processing. Uploaded files use purpose "batch" and can be passed to Create Batch by file ID.`,
  instructions: [
    'Provide JSONL content matching Groq Batch API request format.',
    'The Batch API accepts .jsonl files up to 100 MB.'
  ],
  constraints: ['Only purpose "batch" is supported by Groq file uploads.'],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      filename: z
        .string()
        .default('batch_input.jsonl')
        .describe('Filename to assign to the uploaded JSONL file'),
      jsonlContent: z
        .string()
        .describe('JSONL content where each line is a valid batch request object')
    })
  )
  .output(fileOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let file = await client.uploadFile(ctx.input.jsonlContent, ctx.input.filename);
    let output = mapFile(file);

    return {
      output,
      message: `Uploaded file **${output.filename}** (${output.fileId}) for Groq Batch API processing.`
    };
  })
  .build();

export let listFiles = SlateTool.create(spec, {
  name: 'List Files',
  key: 'list_files',
  description: `List files uploaded to Groq Cloud, including batch input and batch output files.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(z.object({}))
  .output(
    z.object({
      files: z.array(fileOutputSchema).describe('Uploaded files'),
      totalCount: z.number().describe('Number of files returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.listFiles();
    let files = result.data.map(mapFile);

    return {
      output: {
        files,
        totalCount: files.length
      },
      message: `Found **${files.length}** Groq Cloud file(s).`
    };
  })
  .build();

export let getFile = SlateTool.create(spec, {
  name: 'Get File',
  key: 'get_file',
  description: `Retrieve metadata for a Groq Cloud file by ID.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      fileId: z.string().describe('File ID to retrieve')
    })
  )
  .output(fileOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let file = await client.getFile(ctx.input.fileId);
    let output = mapFile(file);

    return {
      output,
      message: `File **${output.filename}** (${output.fileId}), ${output.bytes} bytes, purpose: ${output.purpose}.`
    };
  })
  .build();

export let downloadFile = SlateTool.create(spec, {
  name: 'Download File',
  key: 'download_file',
  description: `Download the content of a Groq Cloud file, such as a batch output JSONL file. File content is returned as a Slate text attachment.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      fileId: z.string().describe('File ID whose content should be downloaded')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('Downloaded file ID'),
      sizeBytes: z.number().describe('Downloaded content size in bytes'),
      mimeType: z.string().optional().describe('Attachment MIME type'),
      attachmentCount: z.number().describe('Number of attachments returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let file = await client.downloadFile(ctx.input.fileId);
    let mimeType = file.contentType ?? 'application/jsonl';

    return {
      output: {
        fileId: ctx.input.fileId,
        sizeBytes: file.sizeBytes,
        mimeType,
        attachmentCount: 1
      },
      attachments: [createTextAttachment(file.content, mimeType)],
      message: `Downloaded file **${ctx.input.fileId}** (${file.sizeBytes} bytes).`
    };
  })
  .build();

export let deleteFile = SlateTool.create(spec, {
  name: 'Delete File',
  key: 'delete_file',
  description: `Delete a Groq Cloud file by ID.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      fileId: z.string().describe('File ID to delete')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('Deleted file ID'),
      deleted: z.boolean().describe('Whether the file was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.deleteFile(ctx.input.fileId);

    return {
      output: {
        fileId: result.id,
        deleted: result.deleted
      },
      message: `Deleted file **${result.id}**.`
    };
  })
  .build();
