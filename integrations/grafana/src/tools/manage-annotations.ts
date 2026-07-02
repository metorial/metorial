import { SlateTool } from 'slates';
import { z } from 'zod';
import { GrafanaClient } from '../lib/client';
import { spec } from '../spec';

export let findAnnotations = SlateTool.create(spec, {
  name: 'Find Annotations',
  key: 'find_annotations',
  description: `Search and filter annotations in Grafana. Annotations mark events on graphs such as deployments, incidents, or releases. Filter by time range, tags, dashboard, panel, or type.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      from: z.number().optional().describe('Start of time range in epoch milliseconds'),
      to: z.number().optional().describe('End of time range in epoch milliseconds'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of annotations to return (default 100)'),
      dashboardUid: z.string().optional().describe('Filter by dashboard UID'),
      panelId: z.number().optional().describe('Filter by panel ID'),
      tags: z.array(z.string()).optional().describe('Filter by annotation tags'),
      type: z.enum(['alert', 'annotation']).optional().describe('Filter by annotation type')
    })
  )
  .output(
    z.object({
      annotations: z.array(
        z.object({
          annotationId: z.number().describe('ID of the annotation'),
          dashboardUid: z.string().optional().describe('Dashboard UID if panel-bound'),
          panelId: z.number().optional().describe('Panel ID if panel-bound'),
          text: z.string().optional().describe('Annotation text'),
          tags: z.array(z.string()).optional().describe('Annotation tags'),
          time: z.number().optional().describe('Start time in epoch milliseconds'),
          timeEnd: z.number().optional().describe('End time in epoch milliseconds'),
          created: z.number().optional().describe('Creation timestamp'),
          updated: z.number().optional().describe('Last update timestamp'),
          login: z.string().optional().describe('User who created the annotation')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let results = await client.findAnnotations({
      from: ctx.input.from,
      to: ctx.input.to,
      limit: ctx.input.limit,
      dashboardUid: ctx.input.dashboardUid,
      panelId: ctx.input.panelId,
      tags: ctx.input.tags,
      type: ctx.input.type
    });

    let annotations = results.map((a: any) => ({
      annotationId: a.id,
      dashboardUid: a.dashboardUID,
      panelId: a.panelId,
      text: a.text,
      tags: a.tags,
      time: a.time,
      timeEnd: a.timeEnd,
      created: a.created,
      updated: a.updated,
      login: a.login
    }));

    return {
      output: { annotations },
      message: `Found **${annotations.length}** annotation(s).`
    };
  })
  .build();

export let createAnnotation = SlateTool.create(spec, {
  name: 'Create Annotation',
  key: 'create_annotation',
  description: `Create a new annotation to mark an event on a dashboard or across the organization. Use for marking deployments, incidents, releases, or any noteworthy event on time-series graphs.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      text: z.string().describe('Annotation text content (supports HTML)'),
      dashboardUid: z
        .string()
        .optional()
        .describe(
          'Dashboard UID to bind the annotation to. Omit for organization-wide annotation.'
        ),
      panelId: z.number().optional().describe('Panel ID within the dashboard to bind to'),
      time: z
        .number()
        .optional()
        .describe('Start time in epoch milliseconds. Defaults to current time.'),
      timeEnd: z
        .number()
        .optional()
        .describe('End time in epoch milliseconds for a range annotation'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Tags for filtering and categorizing the annotation')
    })
  )
  .output(
    z.object({
      annotationId: z.number().describe('ID of the created annotation'),
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.createAnnotation({
      text: ctx.input.text,
      dashboardUID: ctx.input.dashboardUid,
      panelId: ctx.input.panelId,
      time: ctx.input.time,
      timeEnd: ctx.input.timeEnd,
      tags: ctx.input.tags
    });

    return {
      output: {
        annotationId: result.id,
        message: result.message || 'Annotation created.'
      },
      message: `Annotation created (ID: ${result.id})${ctx.input.tags?.length ? ` with tags: ${ctx.input.tags.join(', ')}` : ''}.`
    };
  })
  .build();

export let updateAnnotation = SlateTool.create(spec, {
  name: 'Update Annotation',
  key: 'update_annotation',
  description: `Update an existing annotation's text, tags, or time range.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      annotationId: z.number().describe('ID of the annotation to update'),
      text: z.string().optional().describe('Updated annotation text'),
      tags: z.array(z.string()).optional().describe('Updated tags'),
      time: z.number().optional().describe('Updated start time in epoch milliseconds'),
      timeEnd: z.number().optional().describe('Updated end time in epoch milliseconds')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let update: Record<string, any> = {};
    if (ctx.input.text !== undefined) update.text = ctx.input.text;
    if (ctx.input.tags !== undefined) update.tags = ctx.input.tags;
    if (ctx.input.time !== undefined) update.time = ctx.input.time;
    if (ctx.input.timeEnd !== undefined) update.timeEnd = ctx.input.timeEnd;

    await client.updateAnnotation(ctx.input.annotationId, update);

    return {
      output: {
        message: `Annotation ${ctx.input.annotationId} updated.`
      },
      message: `Annotation **${ctx.input.annotationId}** updated successfully.`
    };
  })
  .build();

export let deleteAnnotation = SlateTool.create(spec, {
  name: 'Delete Annotation',
  key: 'delete_annotation',
  description: `Delete an annotation by its ID. This permanently removes the annotation from all dashboards.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      annotationId: z.number().describe('ID of the annotation to delete')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    await client.deleteAnnotation(ctx.input.annotationId);

    return {
      output: {
        message: `Annotation ${ctx.input.annotationId} deleted.`
      },
      message: `Annotation **${ctx.input.annotationId}** has been deleted.`
    };
  })
  .build();
