import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let makeCall = SlateTool.create(spec, {
  name: 'Make Call',
  key: 'make_call',
  description: `Place an outbound phone call using RingCentral's RingOut API. This initiates a two-leg call: first ringing the caller's phone (fromNumber), then connecting to the destination (toNumber) once answered.`,
  instructions: [
    'Provide **fromNumber** (your RingCentral phone number) and **toNumber** (the destination to call).',
    'Optionally set **callerIdNumber** to control what the recipient sees as the caller ID.',
    'Set **playPrompt** to false to skip the "Press 1 to connect" prompt on the caller\'s device.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      fromNumber: z
        .string()
        .describe('Phone number to call from (your RingCentral number that will ring first)'),
      toNumber: z.string().describe('Destination phone number to connect to'),
      callerIdNumber: z
        .string()
        .optional()
        .describe('Phone number to display as caller ID to the recipient'),
      playPrompt: z
        .boolean()
        .optional()
        .describe(
          'Whether to play a confirmation prompt before connecting the call (defaults to true)'
        )
    })
  )
  .output(
    z.object({
      ringOutId: z.string().describe('Unique identifier for the RingOut call session'),
      status: z
        .object({
          callerStatus: z
            .string()
            .describe('Connection status of the caller leg (e.g. InProgress, Success, Error)'),
          calleeStatus: z
            .string()
            .describe('Connection status of the callee leg (e.g. InProgress, Success, Error)')
        })
        .describe('Current status of both call legs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let result = await client.makeRingOutCall(
      ctx.input.fromNumber,
      ctx.input.toNumber,
      ctx.input.callerIdNumber,
      ctx.input.playPrompt
    );

    let ringOutId = result.id;
    let callerStatus = result.status?.callerStatus || 'InProgress';
    let calleeStatus = result.status?.calleeStatus || 'InProgress';

    return {
      output: {
        ringOutId,
        status: {
          callerStatus,
          calleeStatus
        }
      },
      message: `Initiated RingOut call from \`${ctx.input.fromNumber}\` to \`${ctx.input.toNumber}\`. Ring-out ID: \`${ringOutId}\`, caller status: ${callerStatus}, callee status: ${calleeStatus}.`
    };
  })
  .build();
