import { SlateTool } from 'slates';
import { z } from 'zod';
import { InDesignClient } from '../lib/indesign';
import { spec } from '../spec';

let storageRefSchema = z.object({
  href: z.string().describe('URL or path to the file (pre-signed URL for cloud storage)'),
  storage: z.enum(['external', 'azure', 'dropbox']).describe('Storage type')
});

export let indesignDataMerge = SlateTool.create(spec, {
  name: 'InDesign Data Merge',
  key: 'indesign_data_merge',
  description: `Merge data into an InDesign template and export as PDF, JPEG, PNG, or InDesign document. Automate generation of catalogs, marketing materials, and personalized documents by combining an InDesign template with a data source file.`,
  instructions: [
    'The template must be an InDesign (.indd) file on cloud storage.',
    'The data source should be a CSV or XML file on cloud storage.',
    'Results are written to the specified output location.'
  ]
})
  .input(
    z.object({
      template: storageRefSchema.describe('InDesign template file location'),
      dataSource: storageRefSchema.describe('CSV or XML data source file location'),
      output: storageRefSchema.describe('Output file location'),
      outputFormat: z.enum(['pdf', 'jpeg', 'png', 'indd']).describe('Output file format'),
      multipleRecords: z
        .boolean()
        .optional()
        .describe('Whether to produce output for all data records'),
      recordRange: z.string().optional().describe('Range of records to process (e.g. "1-5")')
    })
  )
  .output(
    z.object({
      jobId: z.string().optional().describe('Async job identifier'),
      status: z.string().describe('Job status'),
      statusUrl: z.string().optional().describe('URL to poll for job status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new InDesignClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      orgId: ctx.auth.orgId
    });

    let result = await client.dataMerge({
      templateSource: ctx.input.template,
      dataSource: ctx.input.dataSource,
      output: {
        ...ctx.input.output,
        type: ctx.input.outputFormat
      },
      options: {
        multipleRecords: ctx.input.multipleRecords,
        recordRange: ctx.input.recordRange
      }
    });

    return {
      output: {
        jobId: result.jobId || result._links?.self?.href?.split('/').pop(),
        status: result.status || 'submitted',
        statusUrl: result._links?.self?.href || result.statusUrl
      },
      message: `InDesign data merge job submitted. Output format: **${ctx.input.outputFormat}**. Status: **${result.status || 'submitted'}**.`
    };
  })
  .build();
