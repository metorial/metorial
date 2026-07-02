import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpeakerRecognitionClient } from '../lib/client';
import { spec } from '../spec';

let speakerProfileSchema = z.object({
  profileId: z.string().describe('Unique speaker profile identifier'),
  locale: z.string().optional().describe('Locale of the profile'),
  enrollmentStatus: z
    .string()
    .optional()
    .describe('Enrollment status after adding the audio sample'),
  enrollmentsCount: z.number().optional().describe('Number of enrollments'),
  enrollmentsSpeechLength: z
    .number()
    .optional()
    .describe('Total speech length of enrollments in seconds'),
  remainingEnrollmentsSpeechLength: z
    .number()
    .optional()
    .describe('Remaining speech length needed for enrollment'),
  createdAt: z.string().optional().describe('ISO 8601 creation timestamp')
});

export let enrollSpeakerProfile = SlateTool.create(spec, {
  name: 'Enroll Speaker Profile',
  key: 'enroll_speaker_profile',
  description: `Adds a voice enrollment sample to a text-independent speaker verification or identification profile. Use this after creating a profile and before verifying or identifying speakers.`,
  instructions: [
    'Create the profile first with Manage Speaker Profile.',
    'Repeat enrollment with additional clear speech samples until enrollmentStatus reports Enrolled.',
    'Speaker Recognition is a Limited Access service; the Azure Speech resource must have access enabled.'
  ],
  constraints: [
    'Audio should be clear WAV speech for the target speaker.',
    'Synthetic, noisy, or very short audio may not satisfy Azure enrollment requirements.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      profileType: z
        .enum(['verification', 'identification'])
        .describe('Type of text-independent speaker profile'),
      profileId: z.string().describe('Profile ID returned by Manage Speaker Profile'),
      audioBase64: z
        .string()
        .describe('Base64-encoded WAV audio containing clear speech from the speaker')
    })
  )
  .output(
    z.object({
      profile: speakerProfileSchema.describe('Updated speaker profile after enrollment')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpeakerRecognitionClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    ctx.info(`Enrolling ${ctx.input.profileType} profile ${ctx.input.profileId}...`);

    let result = await client.enrollProfile(
      ctx.input.profileType,
      ctx.input.profileId,
      ctx.input.audioBase64
    );

    return {
      output: {
        profile: {
          profileId: result.profileId ?? ctx.input.profileId,
          locale: result.locale,
          enrollmentStatus: result.enrollmentStatus,
          enrollmentsCount: result.enrollmentsCount,
          enrollmentsSpeechLength: result.enrollmentsSpeechLength,
          remainingEnrollmentsSpeechLength: result.remainingEnrollmentsSpeechLength,
          createdAt: result.createdDateTime
        }
      },
      message: `Enrollment added to ${ctx.input.profileType} profile \`${ctx.input.profileId}\`. Status: **${result.enrollmentStatus ?? 'Unknown'}**.`
    };
  })
  .build();
