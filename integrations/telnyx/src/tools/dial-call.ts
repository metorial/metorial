import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelnyxClient } from '../lib/client';
import { spec } from '../spec';

export let dialCall = SlateTool.create(spec, {
  name: 'Dial Call',
  key: 'dial_call',
  description: `Initiate an outbound voice call via Call Control. Requires a Call Control Application (connection). Returns the call control ID which can be used for subsequent call actions (transfer, bridge, hangup, etc.).`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      to: z.string().describe('Destination phone number or SIP URI'),
      from: z.string().describe('Caller ID phone number in E.164 format'),
      connectionId: z.string().describe('Call Control Application ID (connection ID)'),
      fromDisplayName: z.string().optional().describe('Caller ID display name'),
      timeoutSecs: z
        .number()
        .optional()
        .describe('Time in seconds to wait for the call to be answered before timing out'),
      webhookUrl: z.string().optional().describe('URL for receiving call events')
    })
  )
  .output(
    z.object({
      callControlId: z.string().describe('Call control ID for managing this call'),
      callLegId: z.string().optional().describe('Call leg ID'),
      callSessionId: z.string().optional().describe('Call session ID'),
      isAlive: z.boolean().optional().describe('Whether the call is still active')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelnyxClient({ token: ctx.auth.token });

    let result = await client.dialCall({
      to: ctx.input.to,
      from: ctx.input.from,
      connectionId: ctx.input.connectionId,
      fromDisplayName: ctx.input.fromDisplayName,
      timeoutSecs: ctx.input.timeoutSecs,
      webhookUrl: ctx.input.webhookUrl
    });

    return {
      output: {
        callControlId: result.call_control_id,
        callLegId: result.call_leg_id,
        callSessionId: result.call_session_id,
        isAlive: result.is_alive
      },
      message: `Call initiated from **${ctx.input.from}** to **${ctx.input.to}**. Call Control ID: **${result.call_control_id}**.`
    };
  })
  .build();
