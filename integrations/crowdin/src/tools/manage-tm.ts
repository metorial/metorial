import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { attachDownload } from '../lib/downloads';
import { createClient } from '../lib/helpers';
import { rawSchema } from '../lib/schemas';
import { spec } from '../spec';

export let manageTMTool = SlateTool.create(spec, {
  name: 'Manage Translation Memory',
  key: 'manage_tm',
  description: `List, create, update, or delete translation memories. Translation memories store previously translated segments for reuse across projects. Also supports exporting TM data.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list',
          'get',
          'create',
          'update',
          'delete',
          'export',
          'export_status',
          'download_export'
        ])
        .describe('Action to perform'),
      exportId: z
        .string()
        .optional()
        .describe(
          'Export job identifier from the export action, required for export_status/download_export'
        ),
      sourceLanguageId: z.string().optional().describe('Limit export to this source language'),
      targetLanguageId: z.string().optional().describe('Limit export to this target language'),
      tmId: z
        .number()
        .optional()
        .describe('Translation Memory ID (required for get/update/delete/export)'),
      name: z.string().optional().describe('TM name (required for create)'),
      languageId: z.string().optional().describe('Source language code (required for create)'),
      groupId: z.number().optional().describe('Group ID (Enterprise only)'),
      format: z.enum(['tmx', 'csv', 'xlsx']).optional().describe('Export format'),
      limit: z.number().optional().describe('Maximum number of results (for list)'),
      offset: z.number().optional().describe('Number of results to skip (for list)')
    })
  )
  .output(
    z.object({
      raw: rawSchema,
      tms: z
        .array(
          z.object({
            tmId: z.number(),
            name: z.string(),
            languageId: z.string().optional(),
            segmentsCount: z.number().optional(),
            createdAt: z.string().optional()
          })
        )
        .optional(),
      exportStatus: z.string().optional(),
      progress: z.number().optional(),
      expiresAt: z.string().optional(),
      exportId: z.string().optional(),
      downloadUrl: z.string().optional(),
      deleted: z.boolean().optional(),
      pagination: z
        .object({
          offset: z.number(),
          limit: z.number()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.listTMs({ limit: ctx.input.limit, offset: ctx.input.offset });

      let tms = result.data.map((item: any) => ({
        tmId: item.data.id,
        name: item.data.name,
        languageId: item.data.languageId ?? undefined,
        segmentsCount: item.data.segmentsCount,
        createdAt: item.data.createdAt ?? undefined
      }));

      return {
        output: { raw: client.lastResponse, tms, pagination: result.pagination },
        message: `Found **${tms.length}** translation memories.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.tmId) throw createApiServiceError('tmId is required for get');

      let tm = await client.getTM(ctx.input.tmId);

      return {
        output: {
          raw: client.lastResponse,
          tms: [
            {
              tmId: tm.id,
              name: tm.name,
              languageId: tm.languageId ?? undefined,
              segmentsCount: tm.segmentsCount,
              createdAt: tm.createdAt ?? undefined
            }
          ]
        },
        message: `Retrieved TM **${tm.name}** (ID: ${tm.id}).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name || !ctx.input.languageId) {
        throw createApiServiceError('name and languageId are required for create');
      }

      let tm = await client.createTM({
        name: ctx.input.name,
        languageId: ctx.input.languageId,
        groupId: ctx.input.groupId
      });

      return {
        output: {
          raw: client.lastResponse,
          tms: [
            {
              tmId: tm.id,
              name: tm.name,
              languageId: tm.languageId ?? undefined,
              segmentsCount: tm.segmentsCount,
              createdAt: tm.createdAt ?? undefined
            }
          ]
        },
        message: `Created TM **${tm.name}** (ID: ${tm.id}).`
      };
    }

    if (action === 'update') {
      if (!ctx.input.tmId) throw createApiServiceError('tmId is required for update');

      let patches: Array<{ op: string; path: string; value: any }> = [];
      if (ctx.input.name !== undefined)
        patches.push({ op: 'replace', path: '/name', value: ctx.input.name });

      if (!patches.length) throw createApiServiceError('Provide a name to update.');
      let tm = await client.updateTM(ctx.input.tmId, patches);

      return {
        output: {
          raw: client.lastResponse,
          tms: [
            {
              tmId: tm.id,
              name: tm.name,
              languageId: tm.languageId ?? undefined,
              segmentsCount: tm.segmentsCount,
              createdAt: tm.createdAt ?? undefined
            }
          ]
        },
        message: `Updated TM **${tm.name}** (ID: ${tm.id}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.tmId) throw createApiServiceError('tmId is required for delete');
      await client.deleteTM(ctx.input.tmId);

      return {
        output: { raw: client.lastResponse, deleted: true },
        message: `Deleted TM with ID **${ctx.input.tmId}**.`
      };
    }

    if (action === 'export') {
      if (!ctx.input.tmId) throw createApiServiceError('tmId is required for export');

      let exportResult = await client.exportTM(ctx.input.tmId, {
        format: ctx.input.format,
        sourceLanguageId: ctx.input.sourceLanguageId,
        targetLanguageId: ctx.input.targetLanguageId
      });

      return {
        output: {
          raw: client.lastResponse,
          exportId: exportResult.identifier,
          exportStatus: exportResult.status
        },
        message: `Started TM export (status: ${exportResult.status}).`
      };
    }

    if (action === 'export_status' || action === 'download_export') {
      if (!ctx.input.tmId || !ctx.input.exportId)
        throw createApiServiceError('tmId and exportId are required.');
      if (action === 'export_status') {
        const result = await client.getTMExportStatus(ctx.input.tmId, ctx.input.exportId);
        return {
          output: {
            raw: client.lastResponse,
            exportId: result.identifier,
            exportStatus: result.status,
            progress: result.progress
          },
          message: `TM export status: ${result.status}.`
        };
      }
      const result = await client.downloadTMExport(ctx.input.tmId, ctx.input.exportId);
      const file = await attachDownload(ctx, result, {
        kind: 'tm',
        tmId: ctx.input.tmId,
        exportId: ctx.input.exportId
      });
      return {
        output: {
          raw: client.lastResponse,
          exportId: ctx.input.exportId,
          downloadUrl: file.url,
          expiresAt: file.expiresAt
        },
        message: 'The translation memory download is ready.'
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
