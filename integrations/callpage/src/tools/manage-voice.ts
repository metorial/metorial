import { SlateTool } from 'slates';
import { z } from 'zod';
import { CallPageClient } from '../lib/client';
import { spec } from '../spec';

let voiceMessageIdEnum = z.enum(['manager_greeting', 'visitor_greeting']);

export let listVoiceMessages = SlateTool.create(spec, {
  name: 'List Voice Messages',
  key: 'list_voice_messages',
  description: `Retrieve all voice greeting messages configured for a widget. Voice messages include the manager greeting (played when manager picks up) and visitor greeting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      widgetId: z.number().describe('The widget ID to list voice messages for')
    })
  )
  .output(
    z.object({
      voiceMessages: z
        .array(z.any())
        .describe('List of voice message objects with enabled status and recording details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CallPageClient({ token: ctx.auth.token });

    let messages = await client.getVoiceMessages(ctx.input.widgetId);

    return {
      output: { voiceMessages: messages },
      message: `Retrieved **${messages.length}** voice messages for widget **#${ctx.input.widgetId}**.`
    };
  })
  .build();

export let upsertVoiceMessage = SlateTool.create(spec, {
  name: 'Upsert Voice Message',
  key: 'upsert_voice_message',
  description: `Create or update a custom voice greeting for a widget. Supports manager greeting (played when manager picks up) and visitor greeting. Accepts an audio file URL (MP3, MPGA, or WAV, max 10 MB).`,
  instructions: [
    'The fileUrl should point to an MP3, MPGA, or WAV file no larger than 10 MB.',
    'Voice message language is determined by the widget locale.',
    'Use action "create" for new messages or "update" for existing ones.'
  ],
  constraints: ['Audio files must be MP3, MPGA, or WAV format, max 10 MB.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      widgetId: z.number().describe('The widget ID'),
      messageId: voiceMessageIdEnum.describe(
        'Voice message type: manager_greeting or visitor_greeting'
      ),
      enabled: z.boolean().describe('Whether this voice message is active'),
      fileUrl: z
        .string()
        .optional()
        .describe('URL to the audio file (MP3, MPGA, or WAV, max 10 MB)'),
      action: z
        .enum(['create', 'update'])
        .default('create')
        .describe('Whether to create a new message or update an existing one')
    })
  )
  .output(
    z.object({
      voiceId: z.number().describe('The ID of the created/updated voice message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CallPageClient({ token: ctx.auth.token });
    let result: { voiceId: number };

    if (ctx.input.action === 'update') {
      result = await client.updateVoiceMessage({
        widgetId: ctx.input.widgetId,
        messageId: ctx.input.messageId,
        enabled: ctx.input.enabled,
        fileUrl: ctx.input.fileUrl
      });
    } else {
      result = await client.createVoiceMessage({
        widgetId: ctx.input.widgetId,
        messageId: ctx.input.messageId,
        enabled: ctx.input.enabled,
        fileUrl: ctx.input.fileUrl
      });
    }

    return {
      output: { voiceId: result.voiceId },
      message: `${ctx.input.action === 'update' ? 'Updated' : 'Created'} voice message **${ctx.input.messageId}** for widget **#${ctx.input.widgetId}**.`
    };
  })
  .build();

export let resetVoiceMessage = SlateTool.create(spec, {
  name: 'Reset Voice Message',
  key: 'reset_voice_message',
  description: `Reset voice greetings for a widget back to defaults. Optionally reset only a specific message type, or all messages if no type is specified.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      widgetId: z.number().describe('The widget ID'),
      messageId: voiceMessageIdEnum
        .optional()
        .describe('Specific message type to reset (omit to reset all)')
    })
  )
  .output(
    z.object({
      widgetId: z.number().describe('The widget ID that was reset')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CallPageClient({ token: ctx.auth.token });

    await client.resetVoiceMessage(ctx.input.widgetId, ctx.input.messageId);

    return {
      output: { widgetId: ctx.input.widgetId },
      message: `Reset ${ctx.input.messageId ? `voice message **${ctx.input.messageId}**` : 'all voice messages'} for widget **#${ctx.input.widgetId}**.`
    };
  })
  .build();
