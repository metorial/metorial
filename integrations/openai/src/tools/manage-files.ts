import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let fileOutputSchema = z.object({
  fileId: z.string().describe('File identifier'),
  filename: z.string().describe('Name of the file'),
  bytes: z.number().describe('File size in bytes'),
  purpose: z.string().describe('Purpose of the file'),
  createdAt: z.number().describe('Unix timestamp when the file was uploaded'),
  status: z.string().optional().describe('Processing status of the file')
});

export let uploadFile = SlateTool.create(spec, {
  name: 'Upload File',
  key: 'upload_file',
  description: `Upload a file to OpenAI for use with batch processing, fine-tuning, vector stores, vision, or user data workflows. Accepts plain text content or base64-encoded bytes.`,
  instructions: [
    'Provide exactly one of content or contentBase64.',
    'Use purpose "batch" for Batch API JSONL files, "fine-tune" for fine-tuning JSONL files, and "user_data" or "vision" for retrieval and multimodal workflows.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      filename: z.string().describe('Name to assign to the uploaded file'),
      purpose: z
        .enum(['assistants', 'batch', 'fine-tune', 'vision', 'user_data', 'evals'])
        .describe('OpenAI file purpose'),
      content: z.string().optional().describe('Text file content to upload'),
      contentBase64: z.string().optional().describe('Base64-encoded file bytes to upload'),
      mimeType: z
        .string()
        .optional()
        .describe('MIME type for the uploaded file, defaults to application/octet-stream'),
      expiresAfterSeconds: z
        .number()
        .optional()
        .describe('Optional file expiration in seconds, anchored at creation time')
    })
  )
  .output(fileOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let file = await client.uploadFile({
      filename: ctx.input.filename,
      purpose: ctx.input.purpose,
      content: ctx.input.content,
      contentBase64: ctx.input.contentBase64,
      mimeType: ctx.input.mimeType,
      expiresAfterSeconds: ctx.input.expiresAfterSeconds
    });

    return {
      output: {
        fileId: file.id,
        filename: file.filename,
        bytes: file.bytes,
        purpose: file.purpose,
        createdAt: file.created_at,
        status: file.status
      },
      message: `Uploaded file **${file.filename}** (${file.id}) for purpose **${file.purpose}**.`
    };
  })
  .build();

export let listFiles = SlateTool.create(spec, {
  name: 'List Files',
  key: 'list_files',
  description: `List files uploaded to OpenAI, optionally filtered by purpose (e.g. "fine-tune", "assistants"). Returns file metadata including ID, name, size, and purpose.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      purpose: z
        .string()
        .optional()
        .describe('Filter files by purpose (e.g. "fine-tune", "assistants", "batch")'),
      limit: z.number().optional().describe('Maximum number of files to return'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order by creation time'),
      after: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      files: z.array(fileOutputSchema).describe('List of files')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listFiles({
      purpose: ctx.input.purpose,
      limit: ctx.input.limit,
      order: ctx.input.order,
      after: ctx.input.after
    });

    let files = (result.data ?? []).map((f: any) => ({
      fileId: f.id,
      filename: f.filename,
      bytes: f.bytes,
      purpose: f.purpose,
      createdAt: f.created_at,
      status: f.status
    }));

    return {
      output: { files },
      message: `Found **${files.length}** file(s)${ctx.input.purpose ? ` with purpose "${ctx.input.purpose}"` : ''}.`
    };
  })
  .build();

export let getFile = SlateTool.create(spec, {
  name: 'Get File',
  key: 'get_file',
  description: `Retrieve metadata for a specific file by its ID. Returns file details including name, size, purpose, and status.`,
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
    let client = createClient(ctx);
    let f = await client.getFile(ctx.input.fileId);

    return {
      output: {
        fileId: f.id,
        filename: f.filename,
        bytes: f.bytes,
        purpose: f.purpose,
        createdAt: f.created_at,
        status: f.status
      },
      message: `File **${f.filename}** (${f.id}), ${f.bytes} bytes, purpose: ${f.purpose}.`
    };
  })
  .build();

export let getFileContent = SlateTool.create(spec, {
  name: 'Get File Content',
  key: 'get_file_content',
  description:
    'Retrieve the raw content of an uploaded OpenAI file, such as JSONL batch output, fine-tuning data, or uploaded text.',
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      fileId: z.string().describe('File ID whose content should be retrieved')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('File identifier'),
      content: z.string().describe('File content returned by OpenAI')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let content = await client.getFileContent(ctx.input.fileId);
    let text = typeof content === 'string' ? content : JSON.stringify(content);

    return {
      output: {
        fileId: ctx.input.fileId,
        content: text
      },
      message: `Retrieved content for file **${ctx.input.fileId}**.`
    };
  })
  .build();

export let deleteFile = SlateTool.create(spec, {
  name: 'Delete File',
  key: 'delete_file',
  description: `Delete a file from your OpenAI account by its ID. The file will no longer be available for use with fine-tuning, vector stores, or other features.`,
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
      fileId: z.string().describe('ID of the deleted file'),
      deleted: z.boolean().describe('Whether the file was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
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
