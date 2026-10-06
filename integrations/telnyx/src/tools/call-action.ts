import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelnyxClient } from '../lib/client';
import { invalid } from '../lib/native';
import { spec } from '../spec';

export let callAction = SlateTool.create(spec, {
  name: 'Call Action',
  key: 'call_action',
  description: `Perform an action on an active call. Supports actions like answer, hangup, transfer, bridge, speak (text-to-speech), play audio, send DTMF, start/stop recording, and more. Use the Dial Call tool first to initiate a call.`,
  instructions: [
    'The callControlId is returned by the Dial Call tool or received via webhook events.',
    'For "speak", provide speakText. For "transfer", provide transferTo. For "play_audio", provide audioUrl.',
    'Additional parameters vary by action - provide them in the actionParams field.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      callControlId: z.string().describe('The call control ID of the active call'),
      action: z
        .enum([
          'get',
          'answer',
          'hangup',
          'transfer',
          'bridge',
          'speak',
          'play_audio',
          'send_dtmf',
          'record_start',
          'record_stop',
          'record_pause',
          'record_resume',
          'gather_using_speak',
          'gather_using_audio',
          'gather_stop',
          'enqueue',
          'leave_queue',
          'fork_start',
          'fork_stop'
        ])
        .describe('The call action to perform'),
      speakText: z
        .string()
        .optional()
        .describe('Text for text-to-speech (for "speak" and "gather_using_speak" actions)'),
      speakLanguage: z.string().optional().describe('Language for TTS (e.g., "en-US")'),
      speakVoice: z.string().optional().describe('Voice for TTS (e.g., "female", "male")'),
      transferTo: z
        .string()
        .optional()
        .describe('Phone number or SIP URI to transfer to (for "transfer" action)'),
      audioUrl: z
        .string()
        .optional()
        .describe(
          'URL of audio file to play (for "play_audio" and "gather_using_audio" actions)'
        ),
      dtmfDigits: z
        .string()
        .optional()
        .describe('DTMF digits to send (for "send_dtmf" action)'),
      callControlIdToBridge: z
        .string()
        .optional()
        .describe('Call control ID to bridge with (for "bridge" action)'),
      actionParams: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional action-specific parameters as key-value pairs')
    })
  )
  .output(
    z.object({
      success: z
        .boolean()
        .describe(
          'Whether Telnyx accepted the command or returned exact call state; command completion is asynchronous'
        ),
      callControlId: z.string().describe('Call control ID of the call'),
      action: z.string().describe('Requested action'),
      nativeAction: z.string().optional(),
      isAlive: z.boolean().optional(),
      callLegId: z.string().optional(),
      callSessionId: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelnyxClient({ token: ctx.auth.token });

    for (const [field, actions] of Object.entries({
      speakText: ['speak', 'gather_using_speak'],
      speakLanguage: ['speak', 'gather_using_speak'],
      speakVoice: ['speak', 'gather_using_speak'],
      transferTo: ['transfer'],
      audioUrl: ['play_audio', 'gather_using_audio'],
      dtmfDigits: ['send_dtmf'],
      callControlIdToBridge: ['bridge']
    })) {
      const value = ctx.input[field as keyof typeof ctx.input];
      if (value !== undefined && !actions.includes(ctx.input.action))
        invalid(
          `${field} is not supported by the selected action. Use only that action's documented parameters.`
        );
    }
    if (ctx.input.action === 'get') {
      const call = await client.getCall(ctx.input.callControlId);
      return {
        output: {
          success: true,
          action: 'get',
          callControlId: call.call_control_id,
          isAlive: call.is_alive,
          callLegId: call.call_leg_id,
          callSessionId: call.call_session_id
        },
        message: `Read exact native state for call ${call.call_control_id}.`
      };
    }

    let params: Record<string, unknown> = { ...ctx.input.actionParams };

    if (ctx.input.speakText) params.payload = ctx.input.speakText;
    if (ctx.input.speakLanguage) params.language = ctx.input.speakLanguage;
    if (ctx.input.speakVoice) params.voice = ctx.input.speakVoice;
    if (ctx.input.transferTo) params.to = ctx.input.transferTo;
    if (ctx.input.audioUrl) params.audio_url = ctx.input.audioUrl;
    if (ctx.input.dtmfDigits) params.digits = ctx.input.dtmfDigits;
    if (ctx.input.callControlIdToBridge)
      params.call_control_id = ctx.input.callControlIdToBridge;

    await client.callAction(ctx.input.callControlId, ctx.input.action, params);

    return {
      output: {
        success: true,
        callControlId: ctx.input.callControlId,
        action: ctx.input.action,
        nativeAction: ctx.input.action === 'play_audio' ? 'playback_start' : ctx.input.action
      },
      message: `Action **${ctx.input.action}** accepted for call **${ctx.input.callControlId}**. Completion is asynchronous.`
    };
  })
  .build();
