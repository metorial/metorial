import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { bulkFileIdSchema, uploadResultSchema, uploadSchema } from '../lib/schemas';
import { spec } from '../spec';

let fileInputSchema = z.object({ id: bulkFileIdSchema });

export let uploadBulkFile = SlateTool.create(spec, {
  key: 'upload_bulk_file',
  name: 'Upload Bulk CSV',
  description:
    'Upload CSV content for bulk phone verification. Specify the zero-based phone column and first data row. The provider accepts up to 100 MB and one million rows. Uploading does not start verification; inspect the returned samples, then call start_bulk_verification with the upload ID.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      csvContent: z.string().describe('Complete CSV content, including any header rows.'),
      fileName: z
        .string()
        .optional()
        .describe('CSV filename ending in .csv. Defaults to contacts.csv.'),
      column: z
        .number()
        .describe(
          'Zero-based index of the column containing phone numbers. Must be a non-negative whole number.'
        ),
      firstRow: z
        .number()
        .describe(
          'Zero-based index of the first data row. Use 1 to skip one header row. Must be a non-negative whole number.'
        )
    })
  )
  .output(uploadResultSchema)
  .handleInvocation(async ctx => {
    let output = await new Client(ctx.auth).uploadBulkFile({
      ...ctx.input,
      fileName: ctx.input.fileName ?? 'contacts.csv'
    });
    return {
      output,
      message: `Uploaded CSV as **${output.id}**. Verification has not been started.`
    };
  })
  .build();

export let startBulkVerification = SlateTool.create(spec, {
  key: 'start_bulk_verification',
  name: 'Start Bulk Verification',
  description:
    'Start a background verification job for an existing CSV upload. Static mode costs 1 credit per billable number. Current mode costs 10 credits when resolved and 1 when current carrier resolution is unavailable; invalid rows are not charged. The account must have enough credits for every row at the full mode rate to start. Poll get_bulk_status, then use download_bulk_file to retrieve results.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    fileInputSchema.extend({
      defaultCountry: z
        .string()
        .optional()
        .describe('Two-letter country code for numbers without an international prefix.'),
      mode: z
        .enum(['static', 'current'])
        .optional()
        .describe(
          'Lookup mode. Defaults to static. Current mode spends more credits; check get_current_coverage first.'
        )
    })
  )
  .output(z.looseObject({ status: z.literal('success'), id: z.string() }))
  .handleInvocation(async ctx => {
    let output = await new Client(ctx.auth).startBulkVerification(ctx.input);
    return {
      output,
      message: `Started verification for **${output.id}**. Poll get_bulk_status to check completion.`
    };
  })
  .build();

export let listBulkFiles = SlateTool.create(spec, {
  key: 'list_bulk_files',
  name: 'List Bulk CSV Files',
  description:
    'List all non-deleted CSV uploads for the connected account, newest first, with their IDs, processing state, and available progress and result counts. The API returns the full list without pagination.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(z.looseObject({ status: z.literal('success'), uploads: z.array(uploadSchema) }))
  .handleInvocation(async ctx => {
    let output = await new Client(ctx.auth).listBulkFiles();
    return { output, message: `Retrieved **${output.uploads.length}** bulk CSV uploads.` };
  })
  .build();

export let getBulkFile = SlateTool.create(spec, {
  key: 'get_bulk_file',
  name: 'Get Bulk CSV File',
  description:
    'Retrieve metadata, processing progress, and available result counts for a CSV upload. Returns an empty object when the upload does not exist or belongs to another account. Use list_bulk_files to discover upload IDs.',
  tags: { readOnly: true, destructive: false }
})
  .input(fileInputSchema)
  .output(uploadSchema.partial())
  .handleInvocation(async ctx => {
    let output = await new Client(ctx.auth).getBulkFile(ctx.input.id);
    return {
      output,
      message: output.id
        ? `Retrieved bulk CSV **${output.id}**.`
        : 'The upload was not found or is not accessible to this account.'
    };
  })
  .build();

export let getBulkStatus = SlateTool.create(spec, {
  key: 'get_bulk_status',
  name: 'Get Bulk Verification Status',
  description:
    'Poll the processing state of a CSV upload. An empty status means the upload does not exist or is not owned by this account. When status is completed, use download_bulk_file for the results.',
  tags: { readOnly: true, destructive: false }
})
  .input(fileInputSchema)
  .output(z.looseObject({ id: z.string().optional(), status: z.string() }))
  .handleInvocation(async ctx => {
    let output = await new Client(ctx.auth).getBulkStatus(ctx.input.id);
    return {
      output,
      message: output.status
        ? `Bulk verification status: **${output.status}**.`
        : 'The upload was not found or is not accessible to this account.'
    };
  })
  .build();

export let downloadBulkFile = SlateTool.create(spec, {
  key: 'download_bulk_file',
  name: 'Download Bulk CSV',
  description:
    'Prepare a downloadable CSV for an existing upload. The provider returns verified results when available, or the original uploaded CSV otherwise. Check get_bulk_status for completed before expecting verification results. No new verification is started.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    fileInputSchema.extend({
      fileName: z
        .string()
        .optional()
        .describe(
          'Suggested download filename. Defaults to the uploaded filename, or results.csv if unavailable.'
        )
    })
  )
  .output(
    z.object({
      fileId: z.string(),
      fileName: z.string(),
      processingStatus: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let upload = await new Client(ctx.auth).getBulkFile(ctx.input.id);
    if (!upload.id) {
      throw createApiServiceError(
        'The upload was not found or is not accessible to this account. Call list_bulk_files to find an accessible upload.'
      );
    }
    let fileName = ctx.input.fileName ?? upload.name ?? 'results.csv';
    await ctx.addAttachment({
      type: 'url',
      url: 'https://api.veriphone.io/v3/file/download',
      query: { id: upload.id, as: fileName },
      headers: { Authorization: `Bearer ${ctx.auth.token}` },
      mimeType: 'text/csv',
      filename: fileName
    });
    return {
      output: { fileId: upload.id, fileName, processingStatus: upload.status },
      message: `Prepared the CSV download for **${upload.id}**. The provider returns the original input if verified results are not yet available.`
    };
  })
  .build();

export let deleteBulkFile = SlateTool.create(spec, {
  key: 'delete_bulk_file',
  name: 'Delete Bulk CSV File',
  description:
    'Permanently delete an uploaded CSV and its verification results. Use list_bulk_files to discover upload IDs. This cannot be undone.',
  tags: { readOnly: false, destructive: true }
})
  .input(fileInputSchema)
  .output(z.looseObject({ status: z.literal('success') }))
  .handleInvocation(async ctx => {
    let output = await new Client(ctx.auth).deleteBulkFile(ctx.input.id);
    return { output, message: `Deleted the CSV upload and results for **${ctx.input.id}**.` };
  })
  .build();
