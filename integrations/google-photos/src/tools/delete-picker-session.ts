import { SlateTool } from 'slates';
import { z } from 'zod';
import { GooglePhotosPickerClient } from '../lib/client';
import { googlePhotosActionScopes } from '../scopes';
import { spec } from '../spec';

export let deletePickerSession = SlateTool.create(spec, {
  name: 'Delete Picker Session',
  key: 'delete_picker_session',
  description: `Delete a Google Photos Picker session. This revokes access to the session and any media items selected during the session.`,
  tags: {
    destructive: true
  }
})
  .scopes(googlePhotosActionScopes.deletePickerSession)
  .input(
    z.object({
      sessionId: z.string().describe('The ID of the picker session to delete')
    })
  )
  .output(
    z.object({
      sessionId: z.string().describe('The ID of the deleted session'),
      deleted: z.boolean().describe('Whether the session was deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GooglePhotosPickerClient(ctx.auth.token);

    await client.deleteSession(ctx.input.sessionId);

    return {
      output: {
        sessionId: ctx.input.sessionId,
        deleted: true
      },
      message: `Deleted picker session **${ctx.input.sessionId}**.`
    };
  })
  .build();
