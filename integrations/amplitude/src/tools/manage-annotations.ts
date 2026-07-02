import { SlateTool } from 'slates';
import { z } from 'zod';
import { AmplitudeClient } from '../lib/client';
import { amplitudeServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageAnnotationsTool = SlateTool.create(spec, {
  name: 'Manage Annotations',
  key: 'manage_annotations',
  description: `Manage chart annotations in Amplitude. Annotations mark important events on time-series charts (e.g., releases, campaigns, milestones). List, create, update, or delete annotations.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform.'),
      annotationId: z
        .string()
        .optional()
        .describe('Annotation ID. Required for "get", "update", and "delete" actions.'),
      label: z
        .string()
        .optional()
        .describe('Label for the annotation. Required for "create", optional for "update".'),
      date: z
        .string()
        .optional()
        .describe(
          'Deprecated legacy date field. Prefer start. Used as start when start is omitted.'
        ),
      start: z
        .string()
        .optional()
        .describe(
          'Annotation start time in ISO 8601 format. Required for "create", optional for "update".'
        ),
      end: z.string().optional().describe('Optional annotation end time in ISO 8601 format.'),
      category: z.string().optional().describe('Optional annotation category.'),
      chartId: z
        .string()
        .optional()
        .describe('Optional Amplitude chart ID to associate with the annotation.'),
      details: z
        .string()
        .optional()
        .describe('Additional details or description for the annotation.')
    })
  )
  .output(
    z.object({
      annotations: z
        .array(
          z.object({
            annotationId: z.string().optional(),
            label: z.string().optional(),
            start: z.string().optional(),
            end: z.string().optional(),
            category: z.string().optional(),
            chartId: z.string().optional(),
            details: z.string().optional()
          })
        )
        .optional()
        .describe('List of annotations (for "list" action).'),
      annotation: z
        .any()
        .optional()
        .describe('Single annotation (for "get"/"create"/"update" actions).'),
      success: z
        .boolean()
        .optional()
        .describe('Whether the operation succeeded (for "delete" action).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AmplitudeClient({
      apiKey: ctx.auth.apiKey,
      secretKey: ctx.auth.secretKey,
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let normalizeAnnotation = (annotation: any) => ({
      annotationId: annotation.id !== undefined ? String(annotation.id) : undefined,
      label: annotation.label,
      start: annotation.start ?? annotation.date,
      end: annotation.end,
      category: annotation.category,
      chartId: annotation.chart_id !== undefined ? String(annotation.chart_id) : undefined,
      details: annotation.details
    });

    if (ctx.input.action === 'list') {
      let result = await client.listAnnotations();
      let rawAnnotations = Array.isArray(result.data)
        ? result.data
        : Array.isArray(result.annotations)
          ? result.annotations
          : Array.isArray(result)
            ? result
            : [];
      let annotations = rawAnnotations.map(normalizeAnnotation);
      return {
        output: { annotations },
        message: `Found **${annotations.length}** annotation(s).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.annotationId) {
        throw amplitudeServiceError('annotationId is required for "get" action.');
      }
      let result = await client.getAnnotation(ctx.input.annotationId);
      return {
        output: { annotation: result.data ?? result },
        message: `Retrieved annotation **${ctx.input.annotationId}**.`
      };
    }

    if (ctx.input.action === 'create') {
      let start = ctx.input.start ?? ctx.input.date;
      if (!ctx.input.label || !start) {
        throw amplitudeServiceError('label and start are required for "create" action.');
      }
      let result = await client.createAnnotation({
        label: ctx.input.label,
        start,
        details: ctx.input.details,
        end: ctx.input.end,
        category: ctx.input.category,
        chartId: ctx.input.chartId
      });
      return {
        output: { annotation: result.data ?? result },
        message: `Created annotation "${ctx.input.label}" starting ${start}.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.annotationId) {
        throw amplitudeServiceError('annotationId is required for "update" action.');
      }
      let result = await client.updateAnnotation(ctx.input.annotationId, {
        label: ctx.input.label,
        start: ctx.input.start ?? ctx.input.date,
        details: ctx.input.details,
        end: ctx.input.end,
        category: ctx.input.category,
        chartId: ctx.input.chartId
      });
      return {
        output: { annotation: result.data ?? result },
        message: `Updated annotation **${ctx.input.annotationId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.annotationId) {
        throw amplitudeServiceError('annotationId is required for "delete" action.');
      }
      await client.deleteAnnotation(ctx.input.annotationId);
      return {
        output: { success: true },
        message: `Deleted annotation **${ctx.input.annotationId}**.`
      };
    }

    throw amplitudeServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
