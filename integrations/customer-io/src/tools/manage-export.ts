import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { AppClient } from '../lib/client';
import { customerIoServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageExport = SlateTool.create(spec, {
  name: 'Manage Export',
  key: 'manage_export',
  description:
    'Create, list, inspect, or download Customer.io exports. Downloaded export file bytes are returned as Slate attachments with structured metadata only.',
  instructions: [
    'For "create_customer_export", provide a Customer.io filters object.',
    'For "get" and "download", provide exportId.',
    'Only exports with status "done" can be downloaded.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create_customer_export', 'list', 'get', 'download'])
        .describe('Export operation to perform'),
      exportId: z.number().optional().describe('Export ID. Required for get and download.'),
      filters: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Customer.io audience filter object. Required for create_customer_export.')
    })
  )
  .output(
    z.object({
      export: z.record(z.string(), z.unknown()).optional().describe('Export metadata'),
      exports: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Export metadata records'),
      exportId: z.number().optional().describe('The affected export ID'),
      status: z.string().optional().describe('Export status'),
      mimeType: z.string().optional().describe('Downloaded attachment MIME type'),
      byteLength: z.number().optional().describe('Downloaded byte length'),
      attachmentCount: z.number().optional().describe('Number of attachments returned')
    })
  )
  .handleInvocation(async ctx => {
    let appClient = new AppClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    if (ctx.input.action === 'create_customer_export') {
      if (!ctx.input.filters) {
        throw customerIoServiceError(
          'filters is required to create a Customer.io customer export.'
        );
      }

      let result = await appClient.createCustomerExport(ctx.input.filters);
      let exportRecord = result?.export ?? result;

      return {
        output: {
          export: exportRecord,
          exportId: exportRecord?.id,
          status: exportRecord?.status
        },
        message: `Created Customer.io export **${exportRecord?.id ?? 'unknown'}**.`
      };
    }

    if (ctx.input.action === 'list') {
      let result = await appClient.listExports();
      let exports = result?.exports ?? [];

      return {
        output: { exports },
        message: `Found **${exports.length}** exports.`
      };
    }

    if (!ctx.input.exportId) {
      throw customerIoServiceError(`exportId is required for "${ctx.input.action}".`);
    }

    if (ctx.input.action === 'get') {
      let result = await appClient.getExport(ctx.input.exportId);
      let exportRecord = result?.export ?? result;

      return {
        output: {
          export: exportRecord,
          exportId: exportRecord?.id ?? ctx.input.exportId,
          status: exportRecord?.status
        },
        message: `Retrieved export **${ctx.input.exportId}**.`
      };
    }

    let downloaded = await appClient.downloadExport(ctx.input.exportId);

    return {
      output: {
        exportId: downloaded.exportId,
        mimeType: downloaded.mimeType,
        byteLength: downloaded.byteLength,
        attachmentCount: 1
      },
      attachments: [createBase64Attachment(downloaded.contentBase64, downloaded.mimeType)],
      message: `Downloaded export **${ctx.input.exportId}** as an attachment.`
    };
  })
  .build();
