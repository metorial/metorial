import { SlateTool } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

let fieldValueChangeSchema = z.object({
  fieldValueChangeId: z.number().describe('Unique identifier of the change'),
  fieldId: z.number().describe('ID of the field'),
  entityId: z.number().describe('ID of the entity'),
  listEntryId: z.number().nullable().describe('List entry ID'),
  actionType: z.number().describe('Type of change (0=created, 1=deleted, 2=updated)'),
  changedAt: z.string().nullable().describe('When the change occurred'),
  changer: z
    .object({
      changerId: z.number().nullable().describe('ID of the user who made the change'),
      changerType: z.string().nullable().describe('Type of changer')
    })
    .optional()
    .describe('Who made the change'),
  valueBefore: z.any().optional().describe('Value before the change'),
  valueAfter: z.any().optional().describe('Value after the change'),
  value: z
    .any()
    .optional()
    .describe('Documented value: old value for a deletion, otherwise the new value.')
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
      entityId: z
        .number()
        .optional()
        .describe(
          'Entity ID; also provide entityType to resolve the appropriate provider filter.'
        ),
      entityType: z
        .number()
        .optional()
        .describe('For entityId: 0=person, 1=organization, 8=opportunity.'),
      personId: z
        .number()
        .optional()
        .describe('Filter this person; mutually exclusive with other entity filters.'),
      organizationId: z
        .number()
        .optional()
        .describe('Filter this organization; mutually exclusive with other entity filters.'),
      opportunityId: z
        .number()
        .optional()
        .describe('Filter this opportunity; mutually exclusive with other entity filters.'),
      changedAfter: z
        .string()
        .optional()
        .describe(
          'ISO 8601 timestamp. For pagination pass the last changedAt string exactly, including microseconds.'
        ),
      orderBy: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Sort direction; forward pagination requires asc.'),
      afterId: z
        .number()
        .optional()
        .describe('Last change ID. Requires changedAfter and orderBy=asc.'),
      limit: z.number().optional().describe('Positive maximum number of changes to retrieve.'),
      actionType: z
        .number()
        .optional()
        .describe('Filter by change type (0=created, 1=deleted, 2=updated)')
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
      entityType: ctx.input.entityType,
      personId: ctx.input.personId,
      organizationId: ctx.input.organizationId,
      opportunityId: ctx.input.opportunityId,
      changedAfter: ctx.input.changedAfter,
      orderBy: ctx.input.orderBy,
      afterId: ctx.input.afterId,
      limit: ctx.input.limit,
      action_type: ctx.input.actionType
    });

    let changes = (Array.isArray(result) ? result : []).map(c => ({
      fieldValueChangeId: c.id,
      fieldId: c.field_id,
      entityId: c.entity_id,
      listEntryId: c.list_entry_id ?? null,
      actionType: c.action_type,
      changedAt: c.changed_at ?? null,
      changer: c.changer
        ? {
            changerId: c.changer.id ?? null,
            changerType: c.changer.type == null ? null : String(c.changer.type)
          }
        : undefined,
      valueBefore:
        c.value_before !== undefined
          ? c.value_before
          : c.action_type === 1
            ? c.value
            : undefined,
      valueAfter:
        c.value_after !== undefined
          ? c.value_after
          : c.action_type !== 1
            ? c.value
            : undefined,
      value: c.value
    }));

    return {
      output: { changes },
      message: `Retrieved **${changes.length}** field value change(s) for field ${ctx.input.fieldId}.`
    };
  })
  .build();
