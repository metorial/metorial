import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpeakerRecognitionClient } from '../lib/client';
import { spec } from '../spec';

export let manageSpeakerProfile = SlateTool.create(spec, {
  name: 'Manage Speaker Profile',
  key: 'manage_speaker_profile',
  description: `Creates, retrieves, lists, or deletes speaker recognition profiles. Speaker profiles are used for voice verification (confirming identity) and identification (determining who is speaking).
Supports text-independent speaker recognition profiles.`,
  instructions: [
    'Use action "create" to create a new profile, "get" to retrieve a profile, "list" to list all profiles, or "delete" to remove a profile.',
    'Specify profileType as "verification" or "identification" based on your use case.',
    'Speaker Recognition is a Limited Access service — ensure your subscription has access.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'list', 'delete'])
        .describe('The action to perform on speaker profiles'),
      profileType: z
        .enum(['verification', 'identification'])
        .describe('Type of speaker profile'),
      profileId: z
        .string()
        .optional()
        .describe('Profile ID (required for "get" and "delete" actions)'),
      locale: z
        .string()
        .optional()
        .describe('Locale for the profile (required for "create" action, e.g., "en-US")')
    })
  )
  .output(
    z.object({
      profile: z
        .object({
          profileId: z.string().describe('Unique profile identifier'),
          locale: z.string().optional().describe('Locale of the profile'),
          enrollmentStatus: z
            .string()
            .optional()
            .describe('Enrollment status (e.g., "Enrolling", "Enrolled")'),
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
        })
        .optional()
        .describe('Profile details (for create, get actions)'),
      profiles: z
        .array(
          z.object({
            profileId: z.string().describe('Unique profile identifier'),
            locale: z.string().optional().describe('Locale of the profile'),
            enrollmentStatus: z.string().optional().describe('Enrollment status')
          })
        )
        .optional()
        .describe('List of profiles (for list action)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the profile was deleted (for delete action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpeakerRecognitionClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let { action, profileType, profileId, locale } = ctx.input;

    if (action === 'create') {
      if (!locale) throw new Error('locale is required for creating a profile.');
      ctx.info(`Creating ${profileType} profile...`);
      let result = await client.createVerificationProfile(locale);
      if (profileType === 'identification') {
        result = await client.createIdentificationProfile(locale);
      }
      return {
        output: {
          profile: {
            profileId: result.profileId,
            locale: result.locale,
            enrollmentStatus: result.enrollmentStatus,
            enrollmentsCount: result.enrollmentsCount,
            enrollmentsSpeechLength: result.enrollmentsSpeechLength,
            remainingEnrollmentsSpeechLength: result.remainingEnrollmentsSpeechLength,
            createdAt: result.createdDateTime
          }
        },
        message: `Created ${profileType} profile: \`${result.profileId}\``
      };
    }

    if (action === 'get') {
      if (!profileId) throw new Error('profileId is required for getting a profile.');
      let result = await client.getProfile(profileType, profileId);
      return {
        output: {
          profile: {
            profileId: result.profileId,
            locale: result.locale,
            enrollmentStatus: result.enrollmentStatus,
            enrollmentsCount: result.enrollmentsCount,
            enrollmentsSpeechLength: result.enrollmentsSpeechLength,
            remainingEnrollmentsSpeechLength: result.remainingEnrollmentsSpeechLength,
            createdAt: result.createdDateTime
          }
        },
        message: `Profile \`${profileId}\`: enrollment status **${result.enrollmentStatus}**`
      };
    }

    if (action === 'list') {
      let result = await client.listProfiles(profileType);
      let profiles = (result.profiles || result || []).map((p: any) => ({
        profileId: p.profileId,
        locale: p.locale,
        enrollmentStatus: p.enrollmentStatus
      }));
      return {
        output: {
          profiles
        },
        message: `Found **${profiles.length}** ${profileType} profile(s).`
      };
    }

    if (action === 'delete') {
      if (!profileId) throw new Error('profileId is required for deleting a profile.');
      ctx.info(`Deleting ${profileType} profile ${profileId}...`);
      await client.deleteProfile(profileType, profileId);
      return {
        output: {
          deleted: true
        },
        message: `Deleted ${profileType} profile \`${profileId}\`.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
