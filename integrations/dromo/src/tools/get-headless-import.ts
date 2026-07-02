import { SlateTool } from 'slates';
import { z } from 'zod';
import { DromoClient } from '../lib/client';
import { spec } from '../spec';

export let getHeadlessImport = SlateTool.create(spec, {
  name: 'Get Headless Import',
  key: 'get_headless_import',
  description: `Retrieves the status and details of a specific headless import. If the import is successful, also fetches the pre-signed download URL for the processed data.`,
  instructions: [
    'Status values: AWAITING_UPLOAD, PENDING, RUNNING, SUCCESSFUL, NEEDS_REVIEW, FAILED.',
    'When status is NEEDS_REVIEW, the reviewUrl allows manual resolution of issues.'
  ],
  constraints: ['Rate limit: 12 requests per minute per import when polling.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      importId: z.string().describe('ID of the headless import to retrieve')
    })
  )
  .output(
    z.object({
      importId: z.string().describe('Unique identifier of the headless import'),
      schemaId: z.string().describe('ID of the schema used for this import'),
      originalFilename: z.string().describe('Original filename of the imported file'),
      status: z
        .string()
        .describe(
          'Current status: AWAITING_UPLOAD, PENDING, RUNNING, SUCCESSFUL, NEEDS_REVIEW, FAILED'
        ),
      createdDate: z.string().describe('ISO-8601 timestamp of when the import was created'),
      numDataRows: z.number().optional().describe('Number of data rows processed'),
      reviewUrl: z
        .string()
        .optional()
        .describe('URL where a user can review and fix issues (when status is NEEDS_REVIEW)'),
      downloadUrl: z
        .string()
        .optional()
        .describe('Pre-signed URL to download the processed data (when status is SUCCESSFUL)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DromoClient({ token: ctx.auth.token });
    let imp = await client.getHeadlessImport(ctx.input.importId);

    let downloadUrl: string | undefined;
    if (imp.status === 'SUCCESSFUL') {
      try {
        let urlResponse = await client.getHeadlessImportDownloadUrl(ctx.input.importId);
        downloadUrl = urlResponse.url;
      } catch {
        // Download URL may not be available yet
      }
    }

    return {
      output: {
        importId: imp.id,
        schemaId: imp.schema_id,
        originalFilename: imp.original_filename,
        status: imp.status,
        createdDate: imp.created_date,
        numDataRows: imp.num_data_rows,
        reviewUrl: imp.review_url,
        downloadUrl
      },
      message: `Headless import **${imp.id}** — status: **${imp.status}**${imp.num_data_rows != null ? `, ${imp.num_data_rows} rows` : ''}.`
    };
  })
  .build();
