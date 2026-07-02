import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { FormdeskClient } from '../lib/client';
import { spec } from '../spec';

export let exportResults = SlateTool.create(spec, {
  name: 'Export Form Results',
  key: 'export_results',
  description: `Exports form results to a file in various formats: Excel, CSV, XML, dBase, FoxPro, or plain text. Returns the file as an attachment. Supports the same date and status filters as the result listing tool.`,
  constraints: [
    'API credits consumed equals the number of entries exported (minimum 1 credit).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formName: z.string().describe('Name or identifier of the form to export results from'),
      format: z
        .enum(['excel2007', 'csv', 'xml', 'dbase', 'foxpro', 'text'])
        .describe('Export file format'),
      createdAfter: z
        .string()
        .optional()
        .describe('Only export results created after this date (ISO 8601)'),
      createdBefore: z
        .string()
        .optional()
        .describe('Only export results created before this date (ISO 8601)'),
      changedAfter: z
        .string()
        .optional()
        .describe('Only export results changed after this date (ISO 8601)'),
      changedBefore: z
        .string()
        .optional()
        .describe('Only export results changed before this date (ISO 8601)'),
      completedAfter: z
        .string()
        .optional()
        .describe('Only export results completed after this date (ISO 8601)'),
      completedBefore: z
        .string()
        .optional()
        .describe('Only export results completed before this date (ISO 8601)'),
      status: z.string().optional().describe('Filter by result status'),
      syncStatus: z
        .string()
        .optional()
        .describe('Filter by sync status (all, unprocessed, processed)'),
      filterName: z.string().optional().describe('Name of a pre-defined filter to apply')
    })
  )
  .output(
    z.object({
      contentType: z.string().describe('MIME type of the exported file'),
      creditsUsed: z
        .string()
        .optional()
        .describe('Number of API credits consumed by this export')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FormdeskClient({
      token: ctx.auth.token,
      host: ctx.auth.host,
      domain: ctx.auth.domain
    });

    ctx.progress(`Exporting results as ${ctx.input.format}...`);
    let result = await client.exportResults({
      formName: ctx.input.formName,
      format: ctx.input.format,
      createdAfter: ctx.input.createdAfter,
      createdBefore: ctx.input.createdBefore,
      changedAfter: ctx.input.changedAfter,
      changedBefore: ctx.input.changedBefore,
      completedAfter: ctx.input.completedAfter,
      completedBefore: ctx.input.completedBefore,
      status: ctx.input.status,
      syncStatus: ctx.input.syncStatus,
      filter: ctx.input.filterName
    });

    return {
      output: {
        contentType: result.contentType,
        creditsUsed: result.credits ? String(result.credits) : undefined
      },
      attachments: [createBase64Attachment(result.content, result.contentType)],
      message: `Successfully exported results from form "${ctx.input.formName}" as **${ctx.input.format}**.`
    };
  })
  .build();
