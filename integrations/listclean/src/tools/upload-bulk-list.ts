import { SlateTool } from 'slates';
import { z } from 'zod';
import { ListcleanClient } from '../lib/client';
import { spec } from '../spec';

export let uploadBulkList = SlateTool.create(spec, {
  name: 'Upload Bulk List',
  key: 'upload_bulk_list',
  description: `Upload a CSV or TXT file containing email addresses for bulk verification. The file must have an 'EMAIL' column header. After uploading, the list is processed asynchronously — use the **Get Bulk List Status** tool to check progress.`,
  instructions: [
    'The file content must be CSV or TXT format with an EMAIL column header.',
    'Additional columns of data may be included and will be preserved in results.',
    'Processing time depends on list size — from a few minutes to a few hours.',
    'Duplicate email addresses are automatically removed to save credits.'
  ],
  constraints: [
    'Supported file formats: CSV (.csv) and TXT (.txt).',
    'The email column must have the header "EMAIL".'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      fileName: z.string().describe('Name of the file being uploaded (e.g., "contacts.csv")'),
      fileContent: z
        .string()
        .describe('Raw file content as a string (CSV or TXT format with EMAIL column header)'),
      fileType: z.enum(['csv', 'txt']).describe('File format: csv or txt')
    })
  )
  .output(
    z.object({
      listId: z.string().describe('Unique identifier for the uploaded bulk list'),
      fileName: z.string().describe('Name of the uploaded file'),
      status: z.string().describe('Current processing status of the list'),
      totalEmails: z.number().describe('Total number of email addresses detected in the file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ListcleanClient({
      token: ctx.auth.token
    });

    ctx.progress('Uploading bulk email list...');
    let result = await client.uploadBulkList(
      ctx.input.fileName,
      ctx.input.fileContent,
      ctx.input.fileType
    );

    return {
      output: {
        listId: String(result.listId || ''),
        fileName: result.fileName || ctx.input.fileName,
        status: result.status || 'processing',
        totalEmails: result.totalEmails ?? 0
      },
      message: `Bulk list **${ctx.input.fileName}** uploaded successfully. List ID: **${result.listId}**, Status: **${result.status}**, Total emails: **${result.totalEmails ?? 0}**.`
    };
  })
  .build();
