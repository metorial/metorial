import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelTelClient } from '../lib/client';
import { spec } from '../spec';

export let initiateCallTool = SlateTool.create(spec, {
  name: 'Initiate Call',
  key: 'initiate_call',
  description: `Initiate an outbound Click2Call (callback) between an agent and a contact. The server first connects to the agent's phone or SIP device (A leg), then bridges the call to the contact's phone number (B leg).
Use this to programmatically place calls from your CRM or application.`,
  instructions: [
    'The "called" field accepts either a SIP device identifier or a phone number for the agent.',
    'If using a SIP device for the agent, the call to the SIP device is free; only the outbound leg is charged.',
    'The callerIdB should ideally be a number purchased from TelTel for proper caller ID display to the contact.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      called: z.string().describe('Agent SIP device or phone number to connect first (A leg)'),
      calling: z.string().describe('Contact phone number to connect to the agent (B leg)'),
      callerId: z
        .string()
        .optional()
        .describe('Caller ID displayed to the agent (e.g. the contact phone number)'),
      callerIdB: z
        .string()
        .optional()
        .describe('Caller ID displayed to the contact (should be a TelTel-purchased number)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the call was successfully initiated'),
      response: z.any().optional().describe('Raw response from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelTelClient(ctx.auth.token);

    let result = await client.initiateCallback({
      called: ctx.input.called,
      calling: ctx.input.calling,
      callerId: ctx.input.callerId,
      callerIdB: ctx.input.callerIdB
    });

    return {
      output: {
        success: true,
        response: result
      },
      message: `Call initiated from **${ctx.input.called}** to **${ctx.input.calling}**.`
    };
  })
  .build();
