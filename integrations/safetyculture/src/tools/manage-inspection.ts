import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { exportDownload } from '../lib/export';
import { siteIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let manageInspection = SlateTool.create(spec, {
  name: 'Manage Inspection',
  key: 'manage_inspection',
  description: `Start, complete, archive, delete, or update an inspection. Use this to manage the lifecycle of inspections including setting owner, site, and exporting to PDF/Word.`,
  instructions: [
    'To start a new inspection, provide a templateId and set the operation to "start".',
    'To complete, archive, or delete an inspection, provide the inspectionId and the corresponding operation.',
    'To export, set operation to "export" and optionally specify the exportFormat.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      operation: z
        .enum(['start', 'complete', 'archive', 'delete', 'export', 'set_owner', 'set_site'])
        .describe('The operation to perform on the inspection'),
      inspectionId: z
        .string()
        .optional()
        .describe('The inspection ID (required for all operations except "start")'),
      templateId: z
        .string()
        .optional()
        .describe('Template ID to start a new inspection from (required for "start")'),
      siteId: siteIdSchema.optional(),
      ownerId: z
        .string()
        .optional()
        .describe('User ID to set as inspection owner (required for "set_owner")'),
      exportFormat: z
        .enum(['pdf', 'word'])
        .optional()
        .describe('Export format (for "export" operation, defaults to "pdf")')
    })
  )
  .output(
    z.object({
      inspectionId: z.string().optional().describe('ID of the affected inspection'),
      success: z.boolean().describe('Whether the operation succeeded'),
      exportUrl: z
        .string()
        .optional()
        .describe(
          'Download URL for the exported inspection, when provided. Signed URLs may expire.'
        ),
      exportStatus: z.string().optional().describe('Export processing status'),
      fileName: z.string().optional().describe('Name of the ready export file'),
      rawResponse: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { operation, inspectionId, templateId, siteId, ownerId, exportFormat } = ctx.input;

    let result: any;
    let message: string;

    switch (operation) {
      case 'start': {
        if (!templateId)
          throw createApiServiceError('templateId is required for starting an inspection');
        result = await client.startInspection(templateId, { siteId });
        let newId = result.audit_id || result.id;
        return {
          output: { inspectionId: newId, success: true, rawResponse: result },
          message: `Started new inspection **${newId}** from template ${templateId}.`
        };
      }
      case 'complete': {
        if (!inspectionId) throw createApiServiceError('inspectionId is required');
        result = await client.completeInspection(inspectionId);
        message = `Completed inspection **${inspectionId}**.`;
        break;
      }
      case 'archive': {
        if (!inspectionId) throw createApiServiceError('inspectionId is required');
        result = await client.archiveInspection(inspectionId);
        message = `Archived inspection **${inspectionId}**.`;
        break;
      }
      case 'delete': {
        if (!inspectionId) throw createApiServiceError('inspectionId is required');
        result = await client.deleteInspection(inspectionId);
        message = `Deleted inspection **${inspectionId}**.`;
        break;
      }
      case 'export': {
        if (!inspectionId) throw createApiServiceError('inspectionId is required');
        result = await client.exportInspection(inspectionId, exportFormat || 'pdf');
        let format = exportFormat || 'pdf';
        let download = exportDownload(result, inspectionId, format);
        if (download) {
          await ctx.addAttachment({
            type: 'url',
            url: download.url,
            mimeType: download.mimeType,
            filename: download.filename,
            ...(download.refreshAt
              ? { refreshAt: download.refreshAt, refreshReference: { inspectionId, format } }
              : {})
          });
        }
        return {
          output: {
            inspectionId,
            success: Boolean(download),
            exportUrl: download?.url || result.url || result.download_url,
            exportStatus: result.status ?? (download ? 'STATUS_DONE' : 'STATUS_IN_PROGRESS'),
            fileName: download?.filename,
            rawResponse: result
          },
          message: download
            ? `Prepared inspection **${inspectionId}** as a downloadable ${format} file.`
            : `Inspection **${inspectionId}** export is still processing. Repeat the same export request to check its status.`
        };
      }
      case 'set_owner': {
        if (!inspectionId) throw createApiServiceError('inspectionId is required');
        if (!ownerId)
          throw createApiServiceError('ownerId is required for set_owner operation');
        result = await client.setInspectionOwner(inspectionId, ownerId);
        message = `Set owner of inspection **${inspectionId}** to user ${ownerId}.`;
        break;
      }
      case 'set_site': {
        if (!inspectionId) throw createApiServiceError('inspectionId is required');
        if (!siteId) throw createApiServiceError('siteId is required for set_site operation');
        result = await client.setInspectionSite(inspectionId, siteId);
        message = `Set site of inspection **${inspectionId}** to ${siteId}.`;
        break;
      }
    }

    return {
      output: { inspectionId, success: true, rawResponse: result },
      message
    };
  })
  .build();
