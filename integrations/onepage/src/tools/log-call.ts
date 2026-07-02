import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { callSchema } from '../lib/schemas';
import { spec } from '../spec';

export let logCall = SlateTool.create(spec, {
  name: 'Log Call',
  key: 'log_call',
  description: `Log a phone call against a contact to track the interaction. Include call details such as the phone number, result, and notes.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact the call was with'),
      text: z.string().optional().describe('Call notes or description'),
      phoneNumber: z.string().optional().describe('Phone number used for the call'),
      callResult: z
        .string()
        .optional()
        .describe(
          'Result of the call (e.g. "interested", "not interested", "no answer", "left voicemail")'
        ),
      callTimeInt: z.number().optional().describe('Time of the call as Unix timestamp'),
      via: z.string().optional().describe('How the call was made (e.g. "phone", "skype")'),
      recordingLink: z.string().optional().describe('Link to call recording')
    })
  )
  .output(callSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let call = await client.createCall(ctx.input);

    return {
      output: call,
      message: `Logged call (${call.callId}) for contact ${call.contactId}.`
    };
  })
  .build();
