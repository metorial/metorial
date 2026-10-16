import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAttributeTemplatesTool = SlateTool.create(spec, {
  name: 'Get Attribute Templates',
  key: 'get_attribute_templates',
  description:
    'Discover supported attribute template names, labels, groups, priorities, and value types before creating or acquiring attributes.',
  instructions: [
    'Use a returned templateName with create_attribute or manage_attribute_ownership.',
    'Use groupName when creating a custom attribute. Values are stored and returned in metric units.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      groups: z.string().optional().describe('Comma-separated group names to filter by'),
      includeLowPriority: z
        .boolean()
        .optional()
        .describe('Include templates with priority 10 or higher'),
      limit: z.number().optional().describe('Positive whole number of results per page'),
      page: z.number().optional().describe('Positive page number, starting at 1')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching templates'),
      templates: z.array(
        z.object({
          templateName: z.string(),
          label: z.string(),
          groupName: z.string(),
          groupLabel: z.string(),
          groupPriority: z.number(),
          priority: z.number(),
          valueType: z.number(),
          valueTypeDescription: z.string()
        })
      ),
      hasMore: z.boolean(),
      nextPageUrl: z.string().nullable().optional(),
      previousPageUrl: z.string().nullable().optional(),
      raw: z.record(z.string(), z.unknown()).optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).getAttributeTemplates(ctx.input);
    return {
      output: {
        totalCount: result.count,
        templates: result.results.map(template => ({
          templateName: template.name,
          label: template.label,
          groupName: template.group.name,
          groupLabel: template.group.label,
          groupPriority: template.group.priority,
          priority: template.priority,
          valueType: template.value_type,
          valueTypeDescription: template.value_type_description
        })),
        hasMore: result.next !== null,
        nextPageUrl: result.next,
        previousPageUrl: result.previous,
        raw: result
      },
      message: `Retrieved ${result.results.length} attribute templates (${result.count} total).`
    };
  })
  .build();
