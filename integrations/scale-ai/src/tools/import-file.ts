import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let importFile = SlateTool.create(spec, {
  name: 'Import File',
  key: 'import_file',
  description: `Import a file from a URL into Scale AI. Returns an attachment URL (prefixed with \`scaledata://\`) that can be used when creating tasks.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      fileUrl: z.string().describe('URL of the file to import'),
      projectName: z
        .string()
        .optional()
        .describe('Project to associate the file with (required for Scale Rapid)')
    })
  )
  .output(
    z
      .object({
        attachmentUrl: z
          .string()
          .optional()
          .describe('Scale-hosted attachment URL (scaledata://) for use in task creation')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.importFile({
      fileUrl: ctx.input.fileUrl,
      projectName: ctx.input.projectName
    });

    return {
      output: {
        attachmentUrl: result.attachment_url,
        ...result
      },
      message: `Imported file from URL. Attachment URL: \`${result.attachment_url ?? 'N/A'}\`.`
    };
  })
  .build();
