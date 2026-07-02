import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createVoiceBroadcast = SlateTool.create(spec, {
  name: 'Create Voice Broadcast',
  key: 'create_voice_broadcast',
  description: `Create and send a voice call broadcast to a list of contacts. Requires a caller ID and a recording (the message to play). Supports scheduling, answering machine detection, and add-on features.`,
  instructions: [
    'You must have a valid callerIdId and recordingId before creating a broadcast.',
    'Use sendImmediately=true to send right away, or provide sendAt for scheduling.',
    'Enable useAmd to detect answering machines and optionally play a different recording.'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Name for the broadcast.'),
      callerIdId: z.string().describe('Caller ID to use as the outgoing number.'),
      recordingId: z.string().describe('Recording ID of the message to play.'),
      contacts: z
        .array(
          z.object({
            phone: z.string().describe('Phone number of the contact.'),
            firstName: z.string().optional().describe('First name of the contact.'),
            lastName: z.string().optional().describe('Last name of the contact.'),
            email: z.string().optional().describe('Email of the contact.')
          })
        )
        .describe('List of contacts to call.'),
      sendImmediately: z.boolean().optional().describe('Send the broadcast immediately.'),
      sendAt: z
        .string()
        .optional()
        .describe('Schedule time in ISO format, e.g. "2024-07-25T12:00:00+0000".'),
      useAmd: z.boolean().optional().describe('Enable answering machine detection.'),
      machineRecordingId: z
        .string()
        .optional()
        .describe('Recording to play when an answering machine is detected.'),
      sendEmail: z.boolean().optional().describe('Also send an email to contacts.'),
      accessAccountId: z.string().optional().describe('Schedule as a specific access account.')
    })
  )
  .output(
    z.object({
      broadcastId: z.string().optional(),
      name: z.string().optional(),
      creditCost: z.number().optional(),
      totalRecipients: z.number().optional(),
      sendAt: z.string().optional(),
      pendingCancel: z.boolean().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let {
      name,
      callerIdId,
      recordingId,
      contacts,
      sendImmediately,
      sendAt,
      useAmd,
      machineRecordingId,
      sendEmail,
      accessAccountId
    } = ctx.input;

    let result = await client.createCall({
      name,
      callerid_id: callerIdId,
      recording_id: recordingId,
      contacts: contacts.map(c => ({
        phone: c.phone,
        firstname: c.firstName,
        lastname: c.lastName,
        email: c.email
      })),
      send_immediately: sendImmediately,
      send_at: sendAt,
      use_amd: useAmd,
      machine_recording_id: machineRecordingId,
      send_email: sendEmail,
      accessaccount_id: accessAccountId
    });

    return {
      output: {
        broadcastId: result.id,
        name: result.name,
        creditCost: result.credit_cost,
        totalRecipients: result.total_recipients,
        sendAt: result.send_at,
        pendingCancel: result.pending_cancel,
        createdAt: result.created_at
      },
      message: `Voice broadcast **${result.name}** created with ID \`${result.id}\`. Recipients: ${result.total_recipients ?? 'N/A'}, Credits: ${result.credit_cost ?? 'N/A'}.`
    };
  })
  .build();
