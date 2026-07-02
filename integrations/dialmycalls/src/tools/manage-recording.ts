import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageRecording = SlateTool.create(spec, {
  name: 'Manage Recording',
  key: 'manage_recording',
  description: `Create, update, or delete audio recordings used for voice call broadcasts.
Supports three creation methods:
- **tts**: Generate from text using text-to-speech (English or Spanish, male or female voice).
- **url**: Import from an MP3 or WAV file URL.
- **phone**: Record by receiving a phone call and speaking the message.`,
  instructions: [
    'For create, you must specify the method (tts, url, or phone) and the corresponding fields.',
    'For tts: provide text, gender (M/F), and language (en/es).',
    'For url: provide the fileUrl pointing to an MP3 or WAV file.',
    'For phone: provide the phone number to call for recording.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The operation to perform.'),
      recordingId: z.string().optional().describe('Required for update and delete actions.'),
      name: z.string().optional().describe('Recording name. Required for create and update.'),
      method: z
        .enum(['tts', 'url', 'phone'])
        .optional()
        .describe('Creation method. Required for create.'),
      text: z
        .string()
        .optional()
        .describe('Text to convert to speech. Required for tts method.'),
      gender: z
        .enum(['M', 'F'])
        .optional()
        .describe('Voice gender for TTS. Required for tts method.'),
      language: z
        .enum(['en', 'es'])
        .optional()
        .describe('Language for TTS: en=English, es=Spanish. Required for tts method.'),
      fileUrl: z
        .string()
        .optional()
        .describe('URL of MP3 or WAV file. Required for url method.'),
      phone: z
        .string()
        .optional()
        .describe('Phone number to call for recording. Required for phone method.'),
      callerIdId: z.string().optional().describe('Caller ID for phone recording.'),
      extension: z.string().optional().describe('Phone extension for phone recording.'),
      whitelabel: z
        .boolean()
        .optional()
        .describe('Hide DialMyCalls intro message during phone recording.')
    })
  )
  .output(
    z.object({
      recordingId: z.string().optional(),
      name: z.string().optional(),
      recordingType: z.string().optional(),
      seconds: z.number().optional(),
      fileUrl: z.string().optional(),
      processed: z.boolean().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let {
      action,
      recordingId,
      name,
      method,
      text,
      gender,
      language,
      fileUrl,
      phone,
      callerIdId,
      extension,
      whitelabel
    } = ctx.input;

    if (action === 'delete') {
      if (!recordingId) throw new Error('recordingId is required for delete action');
      await client.deleteRecording(recordingId);
      return {
        output: { recordingId },
        message: `Recording \`${recordingId}\` deleted successfully.`
      };
    }

    if (action === 'update') {
      if (!recordingId) throw new Error('recordingId is required for update action');
      if (!name) throw new Error('name is required for update action');
      let result = await client.updateRecording(recordingId, { name });
      return {
        output: {
          recordingId: result.id,
          name: result.name,
          recordingType: result.type,
          seconds: result.seconds,
          fileUrl: result.url,
          processed: result.processed,
          createdAt: result.created_at,
          updatedAt: result.updated_at
        },
        message: `Recording \`${recordingId}\` updated to **${name}**.`
      };
    }

    // create
    if (!name) throw new Error('name is required for create action');
    if (!method) throw new Error('method is required for create action');

    let result: any;
    if (method === 'tts') {
      if (!text) throw new Error('text is required for tts method');
      if (!gender) throw new Error('gender is required for tts method');
      if (!language) throw new Error('language is required for tts method');
      result = await client.createRecordingTts({ name, text, gender, language });
    } else if (method === 'url') {
      if (!fileUrl) throw new Error('fileUrl is required for url method');
      result = await client.createRecordingByUrl({ name, url: fileUrl });
    } else {
      if (!phone) throw new Error('phone is required for phone method');
      result = await client.createRecordingByPhone({
        name,
        phone,
        callerid_id: callerIdId,
        extension,
        whitelabel
      });
    }

    return {
      output: {
        recordingId: result.id,
        name: result.name,
        recordingType: result.type,
        seconds: result.seconds,
        fileUrl: result.url,
        processed: result.processed,
        createdAt: result.created_at,
        updatedAt: result.updated_at
      },
      message: `Recording **${result.name}** created via ${method} with ID \`${result.id}\`.`
    };
  })
  .build();
