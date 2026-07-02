import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadBulkFile = SlateTool.create(spec, {
  name: 'Upload Bulk Verification File',
  key: 'upload_bulk_file',
  description: `Upload a CSV or text file containing email addresses for bulk verification. Returns a job ID that can be used to check the processing status and download results.

After uploading, use the **Check Bulk Verification Status** tool to monitor progress and retrieve download links when processing is complete.`,
  instructions: [
    'Provide the file contents as a string with one email address per line.',
    'Give the file a descriptive filename ending in .csv or .txt.'
  ],
  constraints: [
    'Credits are consumed per email verified.',
    'Processing will fail if the account balance is zero.',
    'The file must contain properly formatted email addresses.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      filename: z.string().describe('Name for the uploaded file (e.g., "contacts.csv")'),
      fileContents: z.string().describe('File contents with email addresses, one per line')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('The job/file ID to use when checking status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.uploadBulkFile(ctx.input.filename, ctx.input.fileContents);

    return {
      output: {
        jobId: result.fileId
      },
      message: `File **${ctx.input.filename}** uploaded successfully. Job ID: **${result.fileId}**. Use the Check Bulk Verification Status tool to monitor progress.`
    };
  })
  .build();

export let checkBulkStatus = SlateTool.create(spec, {
  name: 'Check Bulk Verification Status',
  key: 'check_bulk_status',
  description: `Check the processing status of a bulk email verification job. Returns the current status, progress, and download links when processing is complete.

Use the job ID returned by the **Upload Bulk Verification File** tool.`,
  instructions: [
    'Provide the job ID from a previous bulk upload.',
    'When status is "finished", the download links will be available in the output.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      jobId: z
        .string()
        .describe('The job/file ID returned from uploading a bulk verification file')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('The file/job ID'),
      filename: z.string().describe('Name of the uploaded file'),
      totalLines: z.string().describe('Total number of email addresses in the file'),
      linesProcessed: z.string().describe('Number of email addresses processed so far'),
      status: z
        .string()
        .describe('Current processing status (e.g., "finished", "processing")'),
      downloadLinkAll: z
        .string()
        .describe('Download link for all results (available when finished)'),
      downloadLinkOk: z
        .string()
        .describe('Download link for verified/passed results only (available when finished)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getBulkFileStatus(ctx.input.jobId);

    let progressText =
      result.status === 'finished'
        ? 'Processing complete.'
        : `Processing: ${result.linesProcessed}/${result.lines} emails.`;

    return {
      output: {
        jobId: result.fileId,
        filename: result.filename,
        totalLines: result.lines,
        linesProcessed: result.linesProcessed,
        status: result.status,
        downloadLinkAll: result.linkAll,
        downloadLinkOk: result.linkOk
      },
      message: `Job **${result.fileId}** (${result.filename}): status is **${result.status}**. ${progressText}`
    };
  })
  .build();
