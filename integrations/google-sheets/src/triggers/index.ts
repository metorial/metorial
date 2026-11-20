import { SlateTrigger } from 'slates';
import { googleSheetsActionScopes } from '../scopes';
import { spec } from '../spec';
import { newRows } from './new-rows';
import { newRowSchema } from './row-schemas';

export { newRows };

export const newRow = SlateTrigger.create(spec, {
  key: 'new_row',
  name: 'New Row',
  description:
    'Fires when a row is added at the bottom of a sheet. Checked every 15 minutes, so the event arrives a little after the row was added.'
})
  .triggerGroup(newRows)
  .authMethods(['oauth', 'service_account'])
  .scopes(googleSheetsActionScopes.readCells)
  .input(newRowSchema)
  .output(newRowSchema)
  .matches(input => newRowSchema.safeParse(input).success)
  .map(async ctx => ({ type: ctx.input.type, id: ctx.input.eventId, output: ctx.input }))
  .build();
