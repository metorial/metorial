import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let annotationOutput = z.object({
  annotationId: z.string().describe('Annotation ID'),
  content: z.string().describe('Annotation text content'),
  dateMarker: z.string().optional().describe('The date this annotation marks'),
  scope: z
    .string()
    .optional()
    .describe('Scope of the annotation (e.g. "organization", "project")'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  createdBy: z.string().optional().describe('Creator identifier')
});

export let listAnnotationsTool = SlateTool.create(spec, {
  name: 'List Annotations',
  key: 'list_annotations',
  description: `List annotations on charts/dashboards. Annotations mark significant events or deployments with text notes at specific dates.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search annotation content'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      annotations: z.array(annotationOutput),
      hasMore: z.boolean().describe('Whether there are more results')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let data = await client.listAnnotations({
      search: ctx.input.search,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let annotations = (data.results || []).map((a: any) => ({
      annotationId: String(a.id),
      content: a.content,
      dateMarker: a.date_marker,
      scope: a.scope,
      createdAt: a.created_at,
      createdBy: a.created_by ? String(a.created_by.id || a.created_by) : undefined
    }));

    return {
      output: { annotations, hasMore: !!data.next },
      message: `Found **${annotations.length}** annotation(s).`
    };
  })
  .build();

export let getAnnotationTool = SlateTool.create(spec, {
  name: 'Get Annotation',
  key: 'get_annotation',
  description: `Retrieve a specific PostHog annotation by ID.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      annotationId: z.string().describe('Annotation ID')
    })
  )
  .output(annotationOutput)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let a = await client.getAnnotation(ctx.input.annotationId);

    return {
      output: {
        annotationId: String(a.id),
        content: a.content,
        dateMarker: a.date_marker,
        scope: a.scope,
        createdAt: a.created_at,
        createdBy: a.created_by ? String(a.created_by.id || a.created_by) : undefined
      },
      message: `Retrieved annotation **${a.id}**.`
    };
  })
  .build();

export let createAnnotationTool = SlateTool.create(spec, {
  name: 'Create Annotation',
  key: 'create_annotation',
  description: `Create a new annotation to mark a significant event or deployment on PostHog charts and dashboards.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      content: z.string().describe('Annotation text content'),
      dateMarker: z.string().describe('ISO 8601 date that the annotation marks'),
      scope: z
        .enum(['organization', 'project'])
        .optional()
        .describe('Scope of the annotation (default: project)')
    })
  )
  .output(annotationOutput)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let payload: Record<string, any> = {
      content: ctx.input.content,
      date_marker: ctx.input.dateMarker
    };
    if (ctx.input.scope) payload.scope = ctx.input.scope;

    let a = await client.createAnnotation(payload);

    return {
      output: {
        annotationId: String(a.id),
        content: a.content,
        dateMarker: a.date_marker,
        scope: a.scope,
        createdAt: a.created_at,
        createdBy: a.created_by ? String(a.created_by.id || a.created_by) : undefined
      },
      message: `Created annotation on **${ctx.input.dateMarker}**: "${ctx.input.content}".`
    };
  })
  .build();

export let updateAnnotationTool = SlateTool.create(spec, {
  name: 'Update Annotation',
  key: 'update_annotation',
  description: `Update an annotation's content, date marker, or scope.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      annotationId: z.string().describe('Annotation ID to update'),
      content: z.string().optional().describe('Updated annotation text content'),
      dateMarker: z.string().optional().describe('Updated ISO 8601 date marker'),
      scope: z
        .enum(['organization', 'project'])
        .optional()
        .describe('Updated annotation scope')
    })
  )
  .output(annotationOutput)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let payload: Record<string, any> = {};
    if (ctx.input.content !== undefined) payload.content = ctx.input.content;
    if (ctx.input.dateMarker !== undefined) payload.date_marker = ctx.input.dateMarker;
    if (ctx.input.scope !== undefined) payload.scope = ctx.input.scope;

    let a = await client.updateAnnotation(ctx.input.annotationId, payload);

    return {
      output: {
        annotationId: String(a.id),
        content: a.content,
        dateMarker: a.date_marker,
        scope: a.scope,
        createdAt: a.created_at,
        createdBy: a.created_by ? String(a.created_by.id || a.created_by) : undefined
      },
      message: `Updated annotation **${a.id}**.`
    };
  })
  .build();

export let deleteAnnotationTool = SlateTool.create(spec, {
  name: 'Delete Annotation',
  key: 'delete_annotation',
  description: `Delete an annotation from charts/dashboards.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      annotationId: z.string().describe('Annotation ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the annotation was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.deleteAnnotation(ctx.input.annotationId);

    return {
      output: { deleted: true },
      message: `Deleted annotation **${ctx.input.annotationId}**.`
    };
  })
  .build();
