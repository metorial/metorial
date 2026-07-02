import { SlateTool } from 'slates';
import { z } from 'zod';
import { VonageRestClient } from '../lib/client';
import { spec } from '../spec';

export let manageCall = SlateTool.create(spec, {
  name: 'Manage Call',
  key: 'manage_call',
  description: `Control an active voice call: hang up, mute/unmute, earmuff/unearmuff, or transfer to a new NCCO flow. Can also play text-to-speech, stream audio, or send DTMF tones into a call.
Requires the **API Key, Secret & Application JWT** auth method.`,
  instructions: [
    'Use action "hangup" to end a call, "mute"/"unmute" for microphone control, "earmuff"/"unearmuff" for audio output control.',
    'Use action "transfer" with a transferUrl to redirect the call to a new NCCO.',
    'Use action "talk" to play text-to-speech into the call.',
    'Use action "stream" with a streamUrl to play audio into the call.',
    'Use action "dtmf" with digits to send DTMF tones.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      callUuid: z.string().describe('UUID of the call to manage'),
      action: z
        .enum([
          'hangup',
          'mute',
          'unmute',
          'earmuff',
          'unearmuff',
          'transfer',
          'talk',
          'stop_talk',
          'stream',
          'stop_stream',
          'dtmf'
        ])
        .describe('Action to perform on the call'),
      transferUrl: z
        .string()
        .optional()
        .describe('URL returning NCCO for call transfer (required for "transfer" action)'),
      ttsText: z
        .string()
        .optional()
        .describe('Text-to-speech content (required for "talk" action)'),
      ttsLanguage: z
        .string()
        .optional()
        .describe('TTS language code (e.g., "en-US", "fr-FR")'),
      ttsStyle: z.number().optional().describe('TTS voice style index'),
      streamUrl: z
        .string()
        .optional()
        .describe('Audio URL to stream into the call (required for "stream" action)'),
      digits: z
        .string()
        .optional()
        .describe('DTMF digits to send (required for "dtmf" action)'),
      loop: z
        .number()
        .optional()
        .describe('Number of times to repeat TTS or audio stream (0 = infinite)'),
      level: z.number().optional().describe('Audio level from -1 to 1 (default 0)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful'),
      message: z.string().optional().describe('Response message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VonageRestClient({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret,
      applicationId: ctx.auth.applicationId,
      privateKey: ctx.auth.privateKey
    });

    let { action, callUuid } = ctx.input;
    let responseMessage = '';

    switch (action) {
      case 'hangup':
      case 'mute':
      case 'unmute':
      case 'earmuff':
      case 'unearmuff':
        await client.modifyCall(callUuid, { action });
        responseMessage = `Call ${action} successful`;
        break;

      case 'transfer':
        if (!ctx.input.transferUrl) {
          throw new Error('transferUrl is required for the "transfer" action');
        }
        await client.modifyCall(callUuid, {
          action: 'transfer',
          destination: { type: 'ncco', url: [ctx.input.transferUrl] }
        });
        responseMessage = `Call transferred to ${ctx.input.transferUrl}`;
        break;

      case 'talk': {
        if (!ctx.input.ttsText) {
          throw new Error('ttsText is required for the "talk" action');
        }
        let ttsResult = await client.playTts(callUuid, ctx.input.ttsText, {
          language: ctx.input.ttsLanguage,
          style: ctx.input.ttsStyle,
          loop: ctx.input.loop,
          level: ctx.input.level
        });
        responseMessage = ttsResult.message;
        break;
      }

      case 'stop_talk':
        await client.stopTts(callUuid);
        responseMessage = 'TTS stopped';
        break;

      case 'stream': {
        if (!ctx.input.streamUrl) {
          throw new Error('streamUrl is required for the "stream" action');
        }
        let streamResult = await client.playStream(callUuid, [ctx.input.streamUrl], {
          loop: ctx.input.loop,
          level: ctx.input.level
        });
        responseMessage = streamResult.message;
        break;
      }

      case 'stop_stream':
        await client.stopStream(callUuid);
        responseMessage = 'Audio stream stopped';
        break;

      case 'dtmf': {
        if (!ctx.input.digits) {
          throw new Error('digits is required for the "dtmf" action');
        }
        let dtmfResult = await client.sendDtmf(callUuid, ctx.input.digits);
        responseMessage = dtmfResult.message;
        break;
      }
    }

    return {
      output: { success: true, message: responseMessage },
      message: `**${action}** action performed on call \`${callUuid}\`: ${responseMessage}`
    };
  })
  .build();
