import { SlateTool } from 'slates';
import { z } from 'zod';
import { LookerClient } from '../lib/client';
import { spec } from '../spec';

export let validateContent = SlateTool.create(spec, {
  name: 'Validate Content',
  key: 'validate_content',
  description: `Validate LookML content in a project. Checks for errors in models, views, and explores. Also can validate LookML in a specific project for syntax and reference errors.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('LookML project ID to validate. If omitted, validates all content.')
    })
  )
  .output(
    z.object({
      contentValid: z.boolean().describe('Whether all content is valid'),
      contentWithErrors: z
        .array(
          z.object({
            contentType: z
              .string()
              .optional()
              .describe('Type of content (look, dashboard, etc.)'),
            title: z.string().optional().describe('Content title'),
            contentId: z.string().optional().describe('Content ID'),
            errors: z
              .array(
                z.object({
                  message: z.string().optional().describe('Error message'),
                  severity: z.string().optional().describe('Error severity'),
                  kind: z.string().optional().describe('Error kind'),
                  fieldName: z.string().optional().describe('Related field name')
                })
              )
              .optional()
              .describe('Validation errors')
          })
        )
        .optional()
        .describe('Content items with errors'),
      staleContent: z
        .array(
          z.object({
            contentType: z.string().optional().describe('Type of content'),
            title: z.string().optional().describe('Content title'),
            contentId: z.string().optional().describe('Content ID')
          })
        )
        .optional()
        .describe('Stale content items'),
      totalLooksValidated: z.number().optional().describe('Number of Looks validated'),
      totalDashboardsValidated: z
        .number()
        .optional()
        .describe('Number of dashboards validated'),
      totalErrors: z.number().optional().describe('Total number of validation errors')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LookerClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    if (ctx.input.projectId) {
      let result = await client.lookmlValidation(ctx.input.projectId);
      let errors = result.errors || [];
      return {
        output: {
          contentValid: errors.length === 0,
          contentWithErrors: errors.map((e: any) => ({
            contentType: 'lookml',
            title: e.source_file,
            errors: [
              {
                message: e.message,
                severity: e.severity,
                kind: e.kind,
                fieldName: e.source_file
              }
            ]
          })),
          totalErrors: errors.length
        },
        message:
          errors.length === 0
            ? `LookML validation passed for project **${ctx.input.projectId}**.`
            : `Found **${errors.length}** LookML validation error(s) in project **${ctx.input.projectId}**.`
      };
    }

    let result = await client.contentValidation();
    let contentErrors = result.content_with_errors || [];
    let staleContent = result.stale_content || [];

    return {
      output: {
        contentValid: contentErrors.length === 0,
        contentWithErrors: contentErrors.map((c: any) => ({
          contentType: c.look ? 'look' : c.dashboard ? 'dashboard' : 'unknown',
          title: c.look?.title || c.dashboard?.title,
          contentId: c.look
            ? String(c.look.id)
            : c.dashboard
              ? String(c.dashboard.id)
              : undefined,
          errors: c.errors?.map((e: any) => ({
            message: e.message,
            severity: e.severity,
            kind: e.kind,
            fieldName: e.field_name
          }))
        })),
        staleContent: staleContent.map((s: any) => ({
          contentType: s.look ? 'look' : s.dashboard ? 'dashboard' : 'unknown',
          title: s.look?.title || s.dashboard?.title,
          contentId: s.look
            ? String(s.look.id)
            : s.dashboard
              ? String(s.dashboard.id)
              : undefined
        })),
        totalLooksValidated: result.total_looks_validated,
        totalDashboardsValidated: result.total_dashboards_validated,
        totalErrors:
          result.computation_status === 'completed' ? contentErrors.length : undefined
      },
      message:
        contentErrors.length === 0
          ? `Content validation passed. ${result.total_looks_validated || 0} Looks and ${result.total_dashboards_validated || 0} dashboards validated.`
          : `Found **${contentErrors.length}** content item(s) with errors.`
    };
  })
  .build();
