import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let effectSchema = z.object({
  effect: z
    .string()
    .describe('Effect type (e.g., "fibery.entity/create", "fibery.entity/update")'),
  entityId: z.string().describe('The fibery/id of the affected entity'),
  values: z
    .record(z.string(), z.any())
    .optional()
    .describe('Current field values of the entity'),
  previousValues: z
    .record(z.string(), z.any())
    .optional()
    .describe('Previous field values before the change (for updates)')
});

export let entityChangesTrigger = SlateTrigger.create(spec, {
  name: 'Entity Changes',
  key: 'entity_changes',
  description:
    'Triggers when entities of a subscribed Type are created, updated, or have collection items modified. Register the webhook manually via POST to /api/webhooks/v2 with the target URL and Type name.'
})
  .input(
    z.object({
      sequenceId: z.string().describe('Unique sequence ID of the webhook delivery'),
      authorId: z.string().optional().describe('ID of the user who made the change'),
      creationDate: z.string().optional().describe('ISO 8601 timestamp of the change'),
      correlationId: z
        .string()
        .optional()
        .describe('Correlation ID if one was sent with the API command'),
      effect: effectSchema.describe('The individual effect from the webhook payload')
    })
  )
  .output(
    z.object({
      entityId: z.string().describe('The fibery/id of the affected entity'),
      typeName: z
        .string()
        .optional()
        .describe('The type name of the affected entity if available'),
      authorId: z.string().optional().describe('ID of the user who triggered the change'),
      correlationId: z.string().optional().describe('Correlation ID for request matching'),
      changedAt: z.string().optional().describe('ISO 8601 timestamp when the change occurred'),
      currentValues: z
        .record(z.string(), z.any())
        .optional()
        .describe('Current field values after the change'),
      previousValues: z
        .record(z.string(), z.any())
        .optional()
        .describe('Previous field values before the change')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let sequenceId = data.sequenceId || '';
      let authorId = data.author?.['fibery/id'] || data.authorId || '';
      let creationDate = data.createdAt || data.creationDate || '';
      let correlationId = data.correlationId || '';
      let effects: any[] = data.effects || [];

      let inputs = effects.map((effect: any) => ({
        sequenceId,
        authorId,
        creationDate,
        correlationId,
        effect: {
          effect: effect.effect || '',
          entityId: effect.id || effect['fibery/id'] || '',
          values: effect.values || {},
          previousValues: effect.valuesBefore || {}
        }
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let effectType = ctx.input.effect.effect;

      let eventType = 'entity.unknown';
      if (effectType === 'fibery.entity/create') {
        eventType = 'entity.created';
      } else if (effectType === 'fibery.entity/update') {
        eventType = 'entity.updated';
      } else if (effectType === 'fibery.entity/add-collection-items') {
        eventType = 'entity.collection_added';
      } else if (effectType === 'fibery.entity/remove-collection-items') {
        eventType = 'entity.collection_removed';
      } else {
        eventType = `entity.${effectType.replace('fibery.entity/', '')}`;
      }

      let deduplicationId = `${ctx.input.sequenceId}-${ctx.input.effect.entityId}`;

      return {
        type: eventType,
        id: deduplicationId,
        output: {
          entityId: ctx.input.effect.entityId,
          typeName:
            (ctx.input.effect.values?.['fibery/type'] as string | undefined) || undefined,
          authorId: ctx.input.authorId || undefined,
          correlationId: ctx.input.correlationId || undefined,
          changedAt: ctx.input.creationDate || undefined,
          currentValues: ctx.input.effect.values || undefined,
          previousValues: ctx.input.effect.previousValues || undefined
        }
      };
    }
  })
  .build();
