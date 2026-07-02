import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateDocument = SlateTool.create(spec, {
  name: 'Generate Document',
  key: 'generate_document',
  description: `Generates a PDF or Google Doc from a DocsAutomator automation template. Supports multiple data source patterns:
- **API data**: Pass data directly as key-value pairs mapped to template placeholders.
- **Airtable**: Fetch data from an Airtable record by record ID.
- **Google Sheets**: Fetch data from a row by row number.
- **ClickUp**: Fetch data from a ClickUp task by task ID.
- **One-off**: Provide a Google Doc template URL and data directly without a saved automation.

Returns the generated PDF URL and optionally a Google Doc URL. For async jobs, returns a job ID for polling.`,
  instructions: [
    'Either provide an automationId for a saved automation, or a docTemplateLink for a one-off document generation.',
    'The data object keys must match the placeholder names in your template.',
    'For line items, use arrays of objects under keys like "line_items_1".'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      automationId: z
        .string()
        .optional()
        .describe(
          'The automation ID (docId) to use for document generation. Required unless using one-off generation with docTemplateLink.'
        ),
      docTemplateLink: z
        .string()
        .optional()
        .describe(
          'Google Doc template URL for one-off document generation. Use this instead of automationId when no saved automation exists.'
        ),
      documentName: z.string().optional().describe('Custom name for the generated document.'),
      templateData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Key-value pairs mapping to template placeholders. Keys must match placeholder names in the template. For line items, use arrays of objects.'
        ),
      airtableRecordId: z
        .string()
        .optional()
        .describe('Airtable record ID to fetch data from (e.g., "recXXXXXXXXXX").'),
      googleSheetsRowNumber: z
        .number()
        .optional()
        .describe('Google Sheets row number to fetch data from.'),
      clickupTaskId: z.string().optional().describe('ClickUp task ID to fetch data from.'),
      webhookParams: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Custom parameters to include in webhook notifications triggered by this document generation.'
        )
    })
  )
  .output(
    z.object({
      message: z
        .string()
        .optional()
        .describe('Status message from the API (e.g., "success" or "queued").'),
      pdfUrl: z.string().optional().describe('URL to download the generated PDF.'),
      googleDocUrl: z
        .string()
        .optional()
        .describe('URL of the generated Google Doc (if Google Doc saving is enabled).'),
      googleDriveFolderId: z
        .string()
        .optional()
        .describe('Google Drive folder ID where the PDF was saved.'),
      googleDriveFileId: z
        .string()
        .optional()
        .describe('Google Drive file ID of the saved PDF.'),
      jobId: z
        .string()
        .optional()
        .describe(
          'Job ID for async document generation. Use this with the Get Job Status tool to check progress.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, unknown> = {};

    if (ctx.input.automationId) {
      params.docId = ctx.input.automationId;
    }
    if (ctx.input.docTemplateLink) {
      params.docTemplateLink = ctx.input.docTemplateLink;
    }
    if (ctx.input.documentName) {
      params.documentName = ctx.input.documentName;
    }
    if (ctx.input.templateData) {
      params.data = ctx.input.templateData;
    }
    if (ctx.input.airtableRecordId) {
      params.recId = ctx.input.airtableRecordId;
    }
    if (ctx.input.googleSheetsRowNumber !== undefined) {
      params.rowId = ctx.input.googleSheetsRowNumber;
    }
    if (ctx.input.clickupTaskId) {
      params.taskId = ctx.input.clickupTaskId;
    }
    if (ctx.input.webhookParams) {
      params.webhookParams = ctx.input.webhookParams;
    }

    let result = await client.createDocument(params as any);

    let output: Record<string, unknown> = {
      message: result.message
    };

    if (result.pdfUrl) output.pdfUrl = result.pdfUrl;
    if (result.googleDocUrl) output.googleDocUrl = result.googleDocUrl;
    if (result.savePdfGoogleDriveFolderId)
      output.googleDriveFolderId = result.savePdfGoogleDriveFolderId;
    if (result.savePdfGoogleDriveFileId)
      output.googleDriveFileId = result.savePdfGoogleDriveFileId;
    if (result.jobId) output.jobId = result.jobId;

    let isAsync = !!result.jobId;

    return {
      output: output as any,
      message: isAsync
        ? `Document generation queued. Job ID: **${result.jobId}**. Use the Get Job Status tool to check progress.`
        : `Document generated successfully.${result.pdfUrl ? ` [Download PDF](${result.pdfUrl})` : ''}`
    };
  })
  .build();
