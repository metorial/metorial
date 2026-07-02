import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageTMTool = SlateTool.create(spec, {
  name: 'Manage Translation Memory',
  key: 'manage_tm',
  description: `List, create, update, or delete translation memories. Translation memories store previously translated segments for reuse across projects. Also supports exporting TM data.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete', 'export'])
        .describe('Action to perform'),
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
      tms: z
        .array(
          z.object({
            tmId: z.number(),
            name: z.string(),
            languageId: z.string(),
            segmentsCount: z.number().optional(),
            createdAt: z.string().optional()
          })
        )
        .optional(),
      exportStatus: z.string().optional(),
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
        languageId: item.data.languageId,
        segmentsCount: item.data.segmentsCount,
        createdAt: item.data.createdAt
      }));

      return {
        output: { tms, pagination: result.pagination },
        message: `Found **${tms.length}** translation memories.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.tmId) throw new Error('tmId is required for get');

      let tm = await client.getTM(ctx.input.tmId);

      return {
        output: {
          tms: [
            {
              tmId: tm.id,
              name: tm.name,
              languageId: tm.languageId,
              segmentsCount: tm.segmentsCount,
              createdAt: tm.createdAt
            }
          ]
        },
        message: `Retrieved TM **${tm.name}** (ID: ${tm.id}).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name || !ctx.input.languageId) {
        throw new Error('name and languageId are required for create');
      }

      let tm = await client.createTM({
        name: ctx.input.name,
        languageId: ctx.input.languageId,
        groupId: ctx.input.groupId
      });

      return {
        output: {
          tms: [
            {
              tmId: tm.id,
              name: tm.name,
              languageId: tm.languageId,
              segmentsCount: tm.segmentsCount || 0,
              createdAt: tm.createdAt
            }
          ]
        },
        message: `Created TM **${tm.name}** (ID: ${tm.id}).`
      };
    }

    if (action === 'update') {
      if (!ctx.input.tmId) throw new Error('tmId is required for update');

      let patches: Array<{ op: string; path: string; value: any }> = [];
      if (ctx.input.name !== undefined)
        patches.push({ op: 'replace', path: '/name', value: ctx.input.name });

      let tm = await client.updateTM(ctx.input.tmId, patches);

      return {
        output: {
          tms: [
            {
              tmId: tm.id,
              name: tm.name,
              languageId: tm.languageId,
              segmentsCount: tm.segmentsCount,
              createdAt: tm.createdAt
            }
          ]
        },
        message: `Updated TM **${tm.name}** (ID: ${tm.id}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.tmId) throw new Error('tmId is required for delete');
      await client.deleteTM(ctx.input.tmId);

      return {
        output: { deleted: true },
        message: `Deleted TM with ID **${ctx.input.tmId}**.`
      };
    }

    if (action === 'export') {
      if (!ctx.input.tmId) throw new Error('tmId is required for export');

      let exportResult = await client.exportTM(ctx.input.tmId, {
        format: ctx.input.format
      });

      return {
        output: {
          exportId: exportResult.identifier || String(exportResult.id),
          exportStatus: exportResult.status
        },
        message: `Started TM export (status: ${exportResult.status}).`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
