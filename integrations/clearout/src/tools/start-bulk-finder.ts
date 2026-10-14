import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { ClearoutClient } from '../lib/client';
import { spec } from '../spec';

export let startBulkFinder = SlateTool.create(spec, {
  name: 'Start Bulk Finder',
  key: 'start_bulk_finder',
  description:
    'Upload a CSV contact list for background email discovery. Returns a list ID for manage_bulk_finder to check progress, download results, cancel, or remove the list.',
  constraints: ['Email discovery consumes credits.'],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      csvContent: z
        .string()
        .min(1)
        .describe(
          'CSV text containing contact names and company domains, including column headers.'
        ),
      fileName: z
        .string()
        .regex(/\.csv$/i)
        .default('contacts.csv')
        .describe('CSV filename, ending in .csv.'),
      ignoreDuplicateFile: z
        .boolean()
        .optional()
        .describe(
          'Allow an upload with the same filename and size as a recent upload (default false).'
        )
    })
  )
  .output(
    z.object({
      listId: z.string().describe('Bulk finder list ID.'),
      status: z.string().optional().describe('API response status.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClearoutClient({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let result = await client.bulkFinderUpload({
      fileContent: ctx.input.csvContent,
      fileName: ctx.input.fileName,
      ignoreDuplicateFile: ctx.input.ignoreDuplicateFile
    });
    let data = isApiErrorRecord(result.data) ? result.data : result;
    if (typeof data.list_id !== 'string' || !data.list_id) {
      throw createApiServiceError('Clearout did not return a bulk finder list ID.');
    }
    return {
      output: { listId: data.list_id, status: result.status as string | undefined },
      message: `Bulk email discovery started for **${ctx.input.fileName}**. List ID: **${data.list_id}**.`
    };
  })
  .build();
