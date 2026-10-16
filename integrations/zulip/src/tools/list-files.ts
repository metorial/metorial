import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFiles = SlateTool.create(spec, {
  name: 'List Uploaded Files',
  key: 'list_files',
  description:
    'List files uploaded by the authenticated user, including file paths, sizes, and messages that reference them.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      files: z.array(
        z.object({
          fileId: z.number(),
          filename: z.string(),
          pathId: z.string().describe('Provider file path within user_uploads'),
          size: z.number().describe('Size in bytes'),
          createTime: z
            .number()
            .describe(
              'Provider upload timestamp; seconds on Zulip 12 feature level 443 and newer, milliseconds on earlier servers'
            ),
          messageIds: z
            .array(z.number())
            .optional()
            .describe('Message IDs referencing the upload, when returned by the server'),
          raw: z.any().describe('Complete provider file metadata')
        })
      ),
      uploadSpaceUsed: z
        .number()
        .optional()
        .describe('Total bytes of upload storage used by the organization')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).getAttachments();
    let files = result.attachments.map((file: any) => ({
      fileId: file.id,
      filename: file.name,
      pathId: file.path_id,
      size: file.size,
      createTime: file.create_time,
      messageIds: file.message_ids ?? file.messages?.map((message: any) => message.id),
      raw: file
    }));
    return {
      output: { files, uploadSpaceUsed: result.upload_space_used },
      message: `Found ${files.length} uploaded file(s)`
    };
  })
  .build();
