import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeedleClient } from '../lib/client';
import { spec } from '../spec';

export let addFilesToCollection = SlateTool.create(spec, {
  name: 'Add Files to Collection',
  key: 'add_files_to_collection',
  description: `Add one or more files to a collection by providing a URL for each file. URLs can be public or signed upload URLs obtained via the **Get File Upload URL** tool. Files are automatically indexed for semantic search after being added.`,
  instructions: [
    'For public files, provide the direct URL.',
    'For local/private files, first use the Get File Upload URL tool to obtain a signed upload URL, upload the file to it, then use the returned reference URL here.'
  ]
})
  .input(
    z.object({
      collectionId: z.string().describe('ID of the collection to add files to'),
      files: z
        .array(
          z.object({
            name: z.string().describe('Display name for the file'),
            url: z.string().describe('Public URL or signed upload URL of the file')
          })
        )
        .min(1)
        .describe('Files to add to the collection')
    })
  )
  .output(
    z.object({
      addedFiles: z
        .array(
          z.object({
            fileId: z.string().describe('Unique identifier of the added file'),
            name: z.string().describe('Name of the added file'),
            url: z.string().describe('URL of the file'),
            status: z.string().describe('Indexing status of the file'),
            error: z
              .string()
              .optional()
              .describe('Error message if the file failed to be added')
          })
        )
        .describe('Results for each file added')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeedleClient(ctx.auth.token);
    let results = await client.addFilesToCollection(ctx.input.collectionId, ctx.input.files);

    let mapped = results.map(r => ({
      fileId: r.id,
      name: r.name,
      url: r.url,
      status: r.status,
      error: r.error
    }));

    let successCount = mapped.filter(f => !f.error).length;
    let errorCount = mapped.filter(f => f.error).length;

    let message = `Added **${successCount}** file(s) to collection \`${ctx.input.collectionId}\`.`;
    if (errorCount > 0) {
      message += ` **${errorCount}** file(s) had errors.`;
    }

    return {
      output: { addedFiles: mapped },
      message
    };
  })
  .build();
