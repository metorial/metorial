import { SlateTool } from 'slates';
import { z } from 'zod';
import { GooglePhotosPickerClient } from '../lib/client';
import { googlePhotosActionScopes } from '../scopes';
import { spec } from '../spec';

export let createPickerSession = SlateTool.create(spec, {
  name: 'Create Picker Session',
  key: 'create_picker_session',
  description: `Create a new Google Photos Picker session that generates a URI where the user can select photos and videos from their library. After the user makes selections, use **Get Picker Session** to check the status and **List Picked Media** to retrieve the selected items.`,
  instructions: [
    'Direct the user to the returned pickerUri to select photos.',
    'For web apps, append "/autoclose" to the pickerUri to auto-close the Google Photos window after selection.',
    'The pickerUri cannot be opened in an iframe.',
    'Poll the session status using Get Picker Session to know when the user has made selections.'
  ],
  tags: {
    destructive: false
  }
})
  .scopes(googlePhotosActionScopes.createPickerSession)
  .input(
    z.object({
      maxItemCount: z
        .number()
        .min(1)
        .optional()
        .describe('Maximum number of items the user can pick (defaults to 2000)')
    })
  )
  .output(
    z.object({
      sessionId: z.string().describe('Unique identifier for the picker session'),
      pickerUri: z.string().describe('URI to redirect the user to for photo selection'),
      expireTime: z
        .string()
        .optional()
        .describe('When access to this session expires (RFC 3339)'),
      pollInterval: z.string().optional().describe('Recommended time between poll requests'),
      pollTimeout: z.string().optional().describe('When to stop polling')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GooglePhotosPickerClient(ctx.auth.token);

    let session = await client.createSession(ctx.input.maxItemCount);

    return {
      output: {
        sessionId: session.id,
        pickerUri: session.pickerUri,
        expireTime: session.expireTime,
        pollInterval: session.pollingConfig?.pollInterval,
        pollTimeout: session.pollingConfig?.timeoutIn
      },
      message: `Created picker session. Direct the user to: ${session.pickerUri}`
    };
  })
  .build();
