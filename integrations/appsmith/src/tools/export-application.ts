import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let exportApplication = SlateTool.create(spec, {
  name: 'Export Application',
  key: 'export_application',
  description: `Export an Appsmith application to a downloadable JSON file. Known decrypted credential fields are removed. Query text, widget configuration and embedded business data can remain sensitive.`,
  constraints: [
    'The file is limited to 4 MiB after removal of known credential fields. Review remaining application data before sharing.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      applicationId: z.string().describe('The ID of the application to export.')
    })
  )
  .output(
    z.object({
      applicationJson: z
        .any()
        .optional()
        .describe('Deprecated inline export field; use the downloadable JSON file.'),
      applicationName: z.string().optional().describe('The name of the exported application.'),
      filename: z.string().optional().describe('Download filename.'),
      size: z.number().optional().describe('File size in bytes.')
    })
  )
  .handleInvocation(async ctx => {
    const result = await clientFor(ctx).exportApplication(ctx.input.applicationId);
    const filename = `application-${ctx.input.applicationId}.json`;
    await ctx.addAttachment({
      type: 'content',
      content: new Response(result.bytes, { headers: { 'Content-Type': 'application/json' } }),
      filename
    });
    return {
      output: {
        applicationName: result.name,
        filename,
        size: Buffer.byteLength(result.bytes)
      },
      message:
        'Application JSON file is ready. Review embedded queries and business data before sharing.'
    };
  })
  .build();
