import { SlateTool } from 'slates';
import { z } from 'zod';
import { tableauServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let filterValueSchema = z.union([z.string(), z.number(), z.boolean()]);

let customViewOutputSchema = z.object({
  customViewId: z.string(),
  name: z.string().optional(),
  ownerId: z.string().optional(),
  ownerName: z.string().optional(),
  workbookId: z.string().optional(),
  viewId: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

let normalizeCustomView = (customView: any) => ({
  customViewId: customView.id,
  name: customView.name,
  ownerId: customView.owner?.id,
  ownerName: customView.owner?.name,
  workbookId: customView.workbook?.id,
  viewId: customView.view?.id,
  createdAt: customView.createdAt,
  updatedAt: customView.updatedAt
});

export let manageCustomViews = SlateTool.create(spec, {
  name: 'Manage Custom Views',
  key: 'manage_custom_views',
  description: `List, get, update, delete, or export Tableau custom views. Custom views are saved user-specific configurations of workbook views.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'update', 'delete', 'export'])
        .describe('Operation to perform'),
      customViewId: z
        .string()
        .optional()
        .describe('Custom view LUID (required for get, update, delete, export)'),
      name: z.string().optional().describe('New custom view name for update'),
      ownerUserId: z.string().optional().describe('New owner user LUID for update'),
      exportFormat: z
        .enum(['csv', 'image', 'pdf'])
        .optional()
        .describe('Format to export for the export action'),
      pageSize: z.number().int().positive().optional().describe('Page size for list'),
      pageNumber: z.number().int().positive().optional().describe('Page number for list'),
      maxAgeMinutes: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Minimum cache age before Tableau refreshes exported content'),
      filters: z
        .record(z.string(), filterValueSchema)
        .optional()
        .describe('View filters keyed by field name; sent as vf_<field>=value')
    })
  )
  .output(
    z.object({
      customViews: z.array(customViewOutputSchema).optional(),
      customView: customViewOutputSchema.optional(),
      totalCount: z.number().optional(),
      deleted: z.boolean().optional(),
      exportFormat: z.enum(['csv', 'image', 'pdf']).optional(),
      contentType: z.string().optional(),
      csvData: z.string().optional(),
      contentBase64: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.queryCustomViews({
        pageSize: ctx.input.pageSize,
        pageNumber: ctx.input.pageNumber
      });
      let pagination = result.pagination || {};
      let customViews = (result.customViews?.customView || []).map(normalizeCustomView);
      return {
        output: {
          customViews,
          totalCount: Number(pagination.totalAvailable || customViews.length)
        },
        message: `Found **${customViews.length}** custom views.`
      };
    }

    if (!ctx.input.customViewId) {
      throw tableauServiceError(`customViewId is required for ${action} action.`);
    }

    if (action === 'get') {
      let customView = await client.getCustomView(ctx.input.customViewId);
      return {
        output: { customView: normalizeCustomView(customView) },
        message: `Retrieved custom view **${customView.name}**.`
      };
    }

    if (action === 'update') {
      if (ctx.input.name === undefined && ctx.input.ownerUserId === undefined) {
        throw tableauServiceError('Provide name or ownerUserId to update a custom view.');
      }

      let customView = await client.updateCustomView(ctx.input.customViewId, {
        name: ctx.input.name,
        ownerUserId: ctx.input.ownerUserId
      });
      return {
        output: { customView: normalizeCustomView(customView) },
        message: `Updated custom view **${customView.name}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteCustomView(ctx.input.customViewId);
      return {
        output: { deleted: true },
        message: `Deleted custom view \`${ctx.input.customViewId}\`.`
      };
    }

    if (action === 'export') {
      if (!ctx.input.exportFormat) {
        throw tableauServiceError('exportFormat is required for export action.');
      }

      let result = await client.exportCustomView(
        ctx.input.customViewId,
        ctx.input.exportFormat,
        {
          maxAgeMinutes: ctx.input.maxAgeMinutes,
          filters: ctx.input.filters
        }
      );
      return {
        output: {
          exportFormat: ctx.input.exportFormat,
          contentType: result.contentType,
          csvData: result.encoding === 'text' ? result.data : undefined,
          contentBase64: result.encoding === 'base64' ? result.data : undefined
        },
        message: `Exported custom view \`${ctx.input.customViewId}\` as ${ctx.input.exportFormat}.`
      };
    }

    throw tableauServiceError(`Unknown action: ${action}`);
  })
  .build();
