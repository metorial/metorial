import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugsnagClient } from '../lib/client';
import { spec } from '../spec';

export const listEventFields = SlateTool.create(spec, {
  key: 'list_event_fields',
  name: 'List Event Fields',
  description:
    'Discover the event-field keys, comparison types, and possible values available for filtering errors and events in a Bugsnag project.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ projectId: z.string().describe('Project ID from List Projects') }))
  .output(
    z.object({
      fields: z.array(
        z.object({
          displayId: z.string().optional().describe('Event-field key used in filters'),
          name: z.string().optional().describe('Human-readable field name'),
          description: z.string().optional().describe('Meaning of the field'),
          hint: z.string().optional().describe('Provider comparison guidance'),
          custom: z
            .boolean()
            .optional()
            .describe('Whether the organization created the field'),
          matchTypes: z.array(z.string()).optional().describe('Supported comparison types'),
          values: z
            .array(z.unknown())
            .optional()
            .describe('Provider-defined possible values, where finite')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const fields = await new BugsnagClient(ctx.auth).listEventFields(
      ctx.input.projectId || ctx.config.projectId || ''
    );
    return {
      output: {
        fields: fields.map(field => ({
          displayId: field.display_id ?? undefined,
          name: field.filter_options?.name ?? undefined,
          description: field.filter_options?.description ?? undefined,
          hint: field.filter_options?.hint_text ?? undefined,
          custom: field.custom ?? undefined,
          matchTypes: field.match_types ?? undefined,
          values: field.values ?? undefined
        }))
      },
      message: `Retrieved **${fields.length}** event fields.`
    };
  })
  .build();
