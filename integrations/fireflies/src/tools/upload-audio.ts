import { SlateTool } from 'slates';
import { z } from 'zod';
import { type DownloadAuthInput, FirefliesClient } from '../lib/client';
import { firefliesServiceError } from '../lib/errors';
import { spec } from '../spec';

let downloadAuthSchema = z
  .object({
    type: z
      .enum(['none', 'bearer_token', 'basic_auth'])
      .describe('Authentication type for Fireflies to use when downloading the media URL'),
    token: z.string().optional().describe('Bearer token. Required when type is bearer_token.'),
    username: z
      .string()
      .optional()
      .describe('Basic auth username. Optional when type is basic_auth.'),
    password: z
      .string()
      .optional()
      .describe('Basic auth password. Required when type is basic_auth.')
  })
  .optional()
  .describe(
    'Optional media download authentication. For type none, omit token/username/password. For bearer_token, provide token. For basic_auth, provide password and optional username.'
  );

let normalizeDownloadAuth = (
  downloadAuth: z.infer<typeof downloadAuthSchema>
): DownloadAuthInput | undefined => {
  if (!downloadAuth || downloadAuth.type === 'none') {
    if (downloadAuth?.token || downloadAuth?.username || downloadAuth?.password) {
      throw firefliesServiceError(
        'downloadAuth token, username, and password are only valid for authenticated download types.'
      );
    }
    return downloadAuth ? { type: 'none' } : undefined;
  }

  if (downloadAuth.type === 'bearer_token') {
    if (!downloadAuth.token?.trim()) {
      throw firefliesServiceError('downloadAuth.token is required for bearer_token.');
    }
    if (downloadAuth.username || downloadAuth.password) {
      throw firefliesServiceError(
        'downloadAuth.username and downloadAuth.password are only valid for basic_auth.'
      );
    }
    return { type: 'bearer_token', token: downloadAuth.token };
  }

  if (!downloadAuth.password?.trim()) {
    throw firefliesServiceError('downloadAuth.password is required for basic_auth.');
  }
  if (downloadAuth.token) {
    throw firefliesServiceError('downloadAuth.token is only valid for bearer_token.');
  }
  return {
    type: 'basic_auth',
    username: downloadAuth.username,
    password: downloadAuth.password
  };
};

export let uploadAudio = SlateTool.create(spec, {
  name: 'Upload Audio',
  key: 'upload_audio',
  description: `Upload an audio or video file for transcription by providing a publicly accessible HTTPS URL or a URL that Fireflies can download with bearer token or basic auth. Optionally specify attendees, language, video retention, and a webhook URL to receive a notification when transcription is complete.`,
  instructions: [
    'The URL must be accessible by Fireflies via HTTPS.',
    'Use downloadAuth for bearer-token or basic-auth protected media URLs.',
    'Provide attendee information to improve speaker identification and CRM integration.'
  ],
  constraints: [
    'Requires a paid plan (not available on free tier).',
    'Files must be at least 50KB unless bypassSizeCheck is set.'
  ]
})
  .input(
    z.object({
      url: z.string().describe('HTTPS URL of the audio/video file to transcribe'),
      title: z.string().optional().describe('Title to identify the transcribed file'),
      language: z
        .string()
        .optional()
        .describe(
          'Language code for transcription (e.g. "es" for Spanish). Defaults to English.'
        ),
      attendees: z
        .array(
          z.object({
            displayName: z.string().optional().describe('Attendee display name'),
            email: z.string().optional().describe('Attendee email address'),
            phoneNumber: z.string().optional().describe('Attendee phone number')
          })
        )
        .optional()
        .describe('List of expected attendees for speaker identification'),
      webhookUrl: z
        .string()
        .optional()
        .describe('Webhook URL to be notified when transcription completes'),
      clientReferenceId: z
        .string()
        .optional()
        .describe('Custom identifier to track this upload (max 128 characters)'),
      bypassSizeCheck: z
        .boolean()
        .optional()
        .describe('Allow processing of audio files under 50KB'),
      saveVideo: z
        .boolean()
        .optional()
        .describe('Whether Fireflies should save video when the source is video'),
      downloadAuth: downloadAuthSchema
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the upload was accepted'),
      title: z.string().nullable().describe('Title of the uploaded audio'),
      message: z.string().nullable().describe('Response message from Fireflies')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.url.startsWith('https://')) {
      throw firefliesServiceError('url must be an HTTPS URL accessible by Fireflies.');
    }
    if (ctx.input.clientReferenceId && ctx.input.clientReferenceId.length > 128) {
      throw firefliesServiceError('clientReferenceId must be 128 characters or fewer.');
    }

    let client = new FirefliesClient({ token: ctx.auth.token });

    let result = await client.uploadAudio({
      url: ctx.input.url,
      title: ctx.input.title,
      customLanguage: ctx.input.language,
      attendees: ctx.input.attendees,
      webhook: ctx.input.webhookUrl,
      clientReferenceId: ctx.input.clientReferenceId,
      bypassSizeCheck: ctx.input.bypassSizeCheck,
      saveVideo: ctx.input.saveVideo,
      downloadAuth: normalizeDownloadAuth(ctx.input.downloadAuth)
    });

    return {
      output: {
        success: result?.success ?? false,
        title: result?.title ?? null,
        message: result?.message ?? null
      },
      message: result?.success
        ? `Audio upload accepted: **"${result?.title ?? ctx.input.title ?? 'Untitled'}"**. Transcription will begin shortly.`
        : `Audio upload failed: ${result?.message ?? 'Unknown error'}`
    };
  })
  .build();
