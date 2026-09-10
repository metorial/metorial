import { SlateTool } from 'slates';
import { z } from 'zod';
import { createAmplitudeClient } from '../lib/client';
import { amplitudeServiceError } from '../lib/errors';
import { parseResponse, validateDateRange } from '../lib/rest-validation';
import { spec } from '../spec';

export let manageAnnotationsTool = SlateTool.create(spec, {
  name: 'Manage Annotations',
  key: 'manage_annotations',
  description: `Manage chart annotations in Amplitude. Annotations mark important events on time-series charts (e.g., releases, campaigns, milestones). List, create, update, or delete annotations.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .authMethods(['api_key_secret'])
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
      end: z
        .string()
        .nullable()
        .optional()
        .describe(
          'Optional annotation end time in ISO 8601 format. Set null on update to remove the end time.'
        ),
      category: z.string().optional().describe('Optional annotation category.'),
      chartId: z
        .string()
        .nullable()
        .optional()
        .describe(
          'Optional Amplitude chart ID. Set null on update to make the annotation global.'
        ),
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
        .unknown()
        .optional()
        .describe('Single annotation (for "get"/"create"/"update" actions).'),
      success: z
        .boolean()
        .optional()
        .describe('Whether the operation succeeded (for "delete" action).')
    })
  )
  .handleInvocation(async ctx => {
    let client = createAmplitudeClient(ctx);

    let start = ctx.input.start ?? ctx.input.date;
    if (ctx.input.start === undefined && start && /^\d{4}-\d{2}-\d{2}$/.test(start)) {
      validateDateRange(start, start, 'iso-day');
      start = `${start}T00:00:00Z`;
    }
    for (let [field, value] of Object.entries({ start, end: ctx.input.end })) {
      if (
        value !== undefined &&
        value !== null &&
        (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(
          value
        ) ||
          !Number.isFinite(Date.parse(value)))
      )
        throw amplitudeServiceError(
          `${field} must be an ISO 8601 timestamp with a time zone.`
        );
    }
    if (start && ctx.input.end && Date.parse(ctx.input.end) < Date.parse(start))
      throw amplitudeServiceError('end must be on or after start.');

    let annotationSchema = z
      .object({
        id: z.union([z.string(), z.number()]),
        label: z.string(),
        start: z.string(),
        end: z.string().nullish(),
        chart_id: z.string().nullish(),
        details: z.string().nullish(),
        category: z
          .object({ name: z.string().optional(), category: z.string().optional() })
          .nullish()
      })
      .passthrough();
    let normalizeAnnotation = (annotation: z.infer<typeof annotationSchema>) => ({
      annotationId: annotation.id !== undefined ? String(annotation.id) : undefined,
      label: annotation.label,
      start: annotation.start,
      end: annotation.end ?? undefined,
      category: annotation.category?.name ?? annotation.category?.category ?? undefined,
      chartId: annotation.chart_id == null ? undefined : String(annotation.chart_id),
      details: annotation.details ?? undefined
    });

    if (ctx.input.action === 'list') {
      if (ctx.input.category && ctx.input.chartId)
        throw amplitudeServiceError('List annotations using category or chartId, not both.');
      let result = await client.listAnnotations({
        start,
        end: ctx.input.end ?? undefined,
        category: ctx.input.category,
        chartId: ctx.input.chartId ?? undefined
      });
      let rawAnnotations = parseResponse(
        z.array(annotationSchema),
        result.data,
        'list annotations'
      );
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
      if (!ctx.input.label || !start) {
        throw amplitudeServiceError('label and start are required for "create" action.');
      }
      let result = await client.createAnnotation({
        label: ctx.input.label,
        start,
        details: ctx.input.details,
        end: ctx.input.end ?? undefined,
        category: ctx.input.category,
        chartId: ctx.input.chartId ?? undefined
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
        start,
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
