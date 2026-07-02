import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

export let manageAnnotations = SlateTool.create(spec, {
  name: 'Manage Annotations',
  key: 'manage_annotations',
  description: `Create, list, or delete annotations in a Mixpanel project. Annotations mark significant events on the project timeline (e.g., product launches, incidents, campaigns) to provide context in reports.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      operation: z
        .enum(['list', 'create', 'delete'])
        .describe('Annotation operation to perform'),
      fromDate: z
        .string()
        .optional()
        .describe('Start date filter for listing annotations (yyyy-mm-dd)'),
      toDate: z
        .string()
        .optional()
        .describe('End date filter for listing annotations (yyyy-mm-dd)'),
      date: z
        .string()
        .optional()
        .describe('Annotation date/time for creation (yyyy-mm-dd HH:mm:ss)'),
      description: z.string().optional().describe('Annotation text description (for create)'),
      annotationId: z.number().optional().describe('Annotation ID to delete')
    })
  )
  .output(
    z.object({
      annotations: z
        .array(
          z.object({
            annotationId: z.number().describe('Annotation ID'),
            date: z.string().describe('Annotation date'),
            description: z.string().describe('Annotation text'),
            tags: z
              .array(
                z.object({
                  tagId: z.number().describe('Tag ID'),
                  name: z.string().describe('Tag name')
                })
              )
              .describe('Tags on the annotation')
          })
        )
        .optional()
        .describe('List of annotations (for list operation)'),
      createdAnnotation: z
        .object({
          annotationId: z.number().describe('Created annotation ID'),
          date: z.string().describe('Annotation date'),
          description: z.string().describe('Annotation text')
        })
        .optional()
        .describe('Created annotation (for create operation)'),
      deleted: z.boolean().optional().describe('Whether the annotation was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    let { operation } = ctx.input;

    if (operation === 'list') {
      let annotations = await client.listAnnotations({
        fromDate: ctx.input.fromDate,
        toDate: ctx.input.toDate
      });
      return {
        output: { annotations },
        message: `Found **${annotations.length}** annotation(s).`
      };
    }

    if (operation === 'create') {
      let created = await client.createAnnotation({
        date: ctx.input.date ?? new Date().toISOString().slice(0, 19).replace('T', ' '),
        description: ctx.input.description ?? ''
      });
      return {
        output: { createdAnnotation: created },
        message: `Created annotation: "${created.description}" on ${created.date}.`
      };
    }

    if (operation === 'delete' && ctx.input.annotationId !== undefined) {
      await client.deleteAnnotation(ctx.input.annotationId);
      return {
        output: { deleted: true },
        message: `Deleted annotation **${ctx.input.annotationId}**.`
      };
    }

    return {
      output: {},
      message: 'No operation performed. Provide a valid operation and required parameters.'
    };
  })
  .build();
