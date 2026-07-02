import { SlateTool } from 'slates';
import { z } from 'zod';
import { AmplitudeClient } from '../lib/client';
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
          'Date for the annotation in MM-DD-YYYY format. Required for "create", optional for "update".'
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
            date: z.string().optional(),
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

    if (ctx.input.action === 'list') {
      let result = await client.listAnnotations();
      let annotations = (result.data ?? result ?? []).map((a: any) => ({
        annotationId: String(a.id),
        label: a.label,
        date: a.date,
        details: a.details
      }));
      return {
        output: { annotations },
        message: `Found **${annotations.length}** annotation(s).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.annotationId)
        throw new Error('annotationId is required for "get" action.');
      let result = await client.getAnnotation(ctx.input.annotationId);
      return {
        output: { annotation: result.data ?? result },
        message: `Retrieved annotation **${ctx.input.annotationId}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.label || !ctx.input.date)
        throw new Error('label and date are required for "create" action.');
      let result = await client.createAnnotation({
        label: ctx.input.label,
        date: ctx.input.date,
        details: ctx.input.details
      });
      return {
        output: { annotation: result.data ?? result },
        message: `Created annotation "${ctx.input.label}" on ${ctx.input.date}.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.annotationId)
        throw new Error('annotationId is required for "update" action.');
      let result = await client.updateAnnotation(ctx.input.annotationId, {
        label: ctx.input.label,
        date: ctx.input.date,
        details: ctx.input.details
      });
      return {
        output: { annotation: result.data ?? result },
        message: `Updated annotation **${ctx.input.annotationId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.annotationId)
        throw new Error('annotationId is required for "delete" action.');
      await client.deleteAnnotation(ctx.input.annotationId);
      return {
        output: { success: true },
        message: `Deleted annotation **${ctx.input.annotationId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
