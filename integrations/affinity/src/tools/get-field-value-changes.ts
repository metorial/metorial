import { SlateTool } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

let fieldValueChangeSchema = z.object({
  fieldValueChangeId: z.number().describe('Unique identifier of the change'),
  fieldId: z.number().describe('ID of the field'),
  entityId: z.number().describe('ID of the entity'),
  listEntryId: z.number().nullable().describe('List entry ID'),
  actionType: z.number().describe('Type of change (0=created, 1=updated, 2=deleted)'),
  changedAt: z.string().nullable().describe('When the change occurred'),
  changer: z
    .object({
      changerId: z.number().nullable().describe('ID of the user who made the change'),
      changerType: z.string().nullable().describe('Type of changer')
    })
    .optional()
    .describe('Who made the change'),
  valueBefore: z.any().optional().describe('Value before the change'),
  valueAfter: z.any().optional().describe('Value after the change')
});

export let getFieldValueChanges = SlateTool.create(spec, {
  name: 'Get Field Value Changes',
  key: 'get_field_value_changes',
  description: `Retrieve the history of changes to a specific field in Affinity. Useful for auditing status transitions, tracking deal pipeline progress, and understanding how data has evolved over time.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fieldId: z.number().describe('ID of the field to get changes for'),
      listEntryId: z.number().optional().describe('Filter changes for a specific list entry'),
      entityId: z.number().optional().describe('Filter changes for a specific entity'),
      actionType: z
        .number()
        .optional()
        .describe('Filter by change type (0=created, 1=updated, 2=deleted)')
    })
  )
  .output(
    z.object({
      changes: z.array(fieldValueChangeSchema).describe('List of field value changes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    let result = await client.getFieldValueChanges({
      fieldId: ctx.input.fieldId,
      listEntryId: ctx.input.listEntryId,
      entityId: ctx.input.entityId,
      action_type: ctx.input.actionType
    });

    let changes = (Array.isArray(result) ? result : []).map((c: any) => ({
      fieldValueChangeId: c.id,
      fieldId: c.field_id,
      entityId: c.entity_id,
      listEntryId: c.list_entry_id ?? null,
      actionType: c.action_type,
      changedAt: c.changed_at ?? null,
      changer: c.changer
        ? {
            changerId: c.changer.id ?? null,
            changerType: c.changer.type ?? null
          }
        : undefined,
      valueBefore: c.value_before,
      valueAfter: c.value_after
    }));

    return {
      output: { changes },
      message: `Retrieved **${changes.length}** field value change(s) for field ${ctx.input.fieldId}.`
    };
  })
  .build();
