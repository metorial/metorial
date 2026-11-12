import { SlateTrigger } from 'slates';
import { googleSheetsActionScopes } from '../scopes';
import { spec } from '../spec';
import { rowObservations } from './row-observations';
import { rowAddedSchema, rowUpdatedSchema } from './row-schemas';

export { rowObservations };

export const rowAdded = SlateTrigger.create(spec, {
  key: 'row_added',
  name: 'Row Added',
  description:
    'Observes a new immutable row key in the selected table after its silent baseline, checked every 15 minutes. This is a snapshot observation, not an exact insert timestamp.'
})
  .triggerGroup(rowObservations)
  .authMethods(['oauth', 'service_account'])
  .scopes(googleSheetsActionScopes.readCells)
  .input(rowAddedSchema)
  .output(rowAddedSchema)
  .matches(input => rowAddedSchema.safeParse(input).success)
  .map(async ctx => ({ type: ctx.input.type, id: ctx.input.observationId, output: ctx.input }))
  .build();

export const rowUpdated = SlateTrigger.create(spec, {
  key: 'row_updated',
  name: 'Row Updated',
  description:
    'Observes a change in the watched entered values or formula expressions of an existing row key, checked every 15 minutes. Intermediate edits and formula recalculations are not reported.'
})
  .triggerGroup(rowObservations)
  .authMethods(['oauth', 'service_account'])
  .scopes(googleSheetsActionScopes.readCells)
  .input(rowUpdatedSchema)
  .output(rowUpdatedSchema)
  .matches(input => rowUpdatedSchema.safeParse(input).success)
  .map(async ctx => ({ type: ctx.input.type, id: ctx.input.observationId, output: ctx.input }))
  .build();
