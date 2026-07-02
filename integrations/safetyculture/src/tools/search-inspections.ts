import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchInspections = SlateTool.create(spec, {
  name: 'Search Inspections',
  key: 'search_inspections',
  description: `Search and list inspections in your SafetyCulture organization. Filter by modification date, template, archived status, or completion status. Returns inspection IDs, titles, templates, and modification timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      modifiedAfter: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp to filter inspections modified after this date'),
      templateIds: z
        .array(z.string())
        .optional()
        .describe('Filter inspections by one or more template IDs'),
      archived: z
        .enum(['true', 'false', 'both'])
        .optional()
        .describe('Filter by archived status. Defaults to non-archived.'),
      completed: z
        .enum(['true', 'false', 'both'])
        .optional()
        .describe('Filter by completion status'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of inspections to return (default 100)')
    })
  )
  .output(
    z.object({
      inspections: z
        .array(
          z.object({
            inspectionId: z.string().describe('Unique inspection identifier'),
            title: z.string().optional().describe('Inspection title'),
            templateId: z.string().optional().describe('Template ID used for this inspection'),
            modifiedAt: z.string().optional().describe('Last modification timestamp'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of matching inspections'),
      total: z.number().optional().describe('Total number of matching inspections')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchInspections({
      modifiedAfter: ctx.input.modifiedAfter,
      templateId: ctx.input.templateIds,
      archived: ctx.input.archived,
      completed: ctx.input.completed,
      limit: ctx.input.limit
    });

    let inspections = result.inspections.map((a: any) => ({
      inspectionId: a.audit_id,
      title: a.audit_title,
      templateId: a.template_id,
      modifiedAt: a.modified_at,
      createdAt: a.created_at
    }));

    return {
      output: {
        inspections,
        total: result.total
      },
      message: `Found **${inspections.length}** inspections${result.total ? ` out of ${result.total} total` : ''}.`
    };
  })
  .build();
