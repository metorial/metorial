import { SlateTool } from 'slates';
import { z } from 'zod';
import { WrikeClient } from '../lib/client';
import { spec } from '../spec';

export let listAttachments = SlateTool.create(spec, {
  name: 'List Attachments',
  key: 'list_attachments',
  description: `List file attachments on a task or folder/project. Returns attachment metadata including name, type, size, and creation date.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().optional().describe('Task ID to list attachments for'),
      folderId: z.string().optional().describe('Folder/project ID to list attachments for')
    })
  )
  .output(
    z.object({
      attachments: z.array(
        z.object({
          attachmentId: z.string(),
          name: z.string(),
          authorId: z.string(),
          createdDate: z.string(),
          type: z.string(),
          contentType: z.string(),
          size: z.number().optional(),
          version: z.number()
        })
      ),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WrikeClient({
      token: ctx.auth.token,
      host: ctx.auth.host
    });

    let result = await client.getAttachments({
      taskId: ctx.input.taskId,
      folderId: ctx.input.folderId
    });

    let attachments = result.data.map(a => ({
      attachmentId: a.id,
      name: a.name,
      authorId: a.authorId,
      createdDate: a.createdDate,
      type: a.type,
      contentType: a.contentType,
      size: a.size,
      version: a.version
    }));

    return {
      output: { attachments, count: attachments.length },
      message: `Found **${attachments.length}** attachment(s).`
    };
  })
  .build();
