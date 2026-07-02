import { SlateTool } from 'slates';
import { z } from 'zod';
import { GooglePhotosPickerClient } from '../lib/client';
import { googlePhotosActionScopes } from '../scopes';
import { spec } from '../spec';

export let getPickerSession = SlateTool.create(spec, {
  name: 'Get Picker Session',
  key: 'get_picker_session',
  description: `Retrieve the current status of a Google Photos Picker session. Use this to check whether the user has selected media items. When **mediaItemsSet** is true, use **List Picked Media** to get the selected items.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googlePhotosActionScopes.getPickerSession)
  .input(
    z.object({
      sessionId: z.string().describe('The ID of the picker session to check')
    })
  )
  .output(
    z.object({
      sessionId: z.string().describe('Unique identifier for the picker session'),
      pickerUri: z.string().describe('URI for user photo selection'),
      mediaItemsSet: z
        .boolean()
        .optional()
        .describe('Whether the user has selected media items'),
      expireTime: z
        .string()
        .optional()
        .describe('When access to this session expires (RFC 3339)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GooglePhotosPickerClient(ctx.auth.token);

    let session = await client.getSession(ctx.input.sessionId);

    return {
      output: {
        sessionId: session.id,
        pickerUri: session.pickerUri,
        mediaItemsSet: session.mediaItemsSet,
        expireTime: session.expireTime
      },
      message: session.mediaItemsSet
        ? 'User has selected media items. Use **List Picked Media** to retrieve them.'
        : 'User has not yet selected media items. Continue polling or wait for user action.'
    };
  })
  .build();
