import { SlateTool } from 'slates';
import { z } from 'zod';
import { createAmplitudeClient } from '../lib/client';
import { amplitudeServiceError } from '../lib/errors';
import { parseResponse, recordSchema } from '../lib/rest-validation';
import { spec } from '../spec';

export let getUserProfileTool = SlateTool.create(spec, {
  name: 'Get User Profile',
  key: 'get_user_profile',
  description: `Retrieve an Amplitude user profile including user properties, computed properties, and synced cohort memberships. Look up by user ID or resolve an Amplitude ID to the user's profile.`,
  constraints: ['Not available for EU data region customers.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .authMethods(['api_key_secret'])
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe('User ID to look up. Provide either userId or amplitudeId.'),
      amplitudeId: z.number().optional().describe('Amplitude internal ID to look up.')
    })
  )
  .output(
    z.object({
      userData: z
        .object({
          userId: z.string().optional().describe('The user ID.'),
          amplitudeId: z.number().optional().describe('Amplitude internal ID.'),
          userProperties: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('User properties.'),
          computedUserProperties: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Computed user properties from Amplitude.'),
          cohortIds: z
            .array(z.string())
            .optional()
            .describe('List of cohort IDs the user belongs to.'),
          recommendations: z
            .array(z.unknown())
            .optional()
            .describe('Personalized recommendations for the user.')
        })
        .describe('User profile data.')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.userId && ctx.input.amplitudeId === undefined) {
      throw amplitudeServiceError('Provide either userId or amplitudeId.');
    }

    if (ctx.input.userId && ctx.input.amplitudeId !== undefined) {
      throw amplitudeServiceError('Provide only one of userId or amplitudeId.');
    }

    let client = createAmplitudeClient(ctx);

    let result = await client.getUserProfile({
      userId: ctx.input.userId,
      amplitudeId: ctx.input.amplitudeId
    });

    let profileData = parseResponse(
      z.object({ userData: recordSchema }),
      result,
      'user profile'
    ).userData;

    return {
      output: {
        userData: {
          userId:
            typeof profileData.user_id === 'string' ? profileData.user_id : ctx.input.userId,
          amplitudeId: ctx.input.amplitudeId,
          computedUserProperties:
            profileData.computed_user_properties == null
              ? undefined
              : parseResponse(
                  recordSchema,
                  profileData.computed_user_properties,
                  'computed properties'
                ),
          userProperties:
            profileData.amp_props == null
              ? undefined
              : parseResponse(recordSchema, profileData.amp_props, 'user properties'),
          cohortIds:
            profileData.cohort_ids == null
              ? undefined
              : parseResponse(z.array(z.string()), profileData.cohort_ids, 'profile cohorts'),
          recommendations:
            profileData.recommendations == null
              ? undefined
              : parseResponse(
                  z.array(z.unknown()),
                  profileData.recommendations,
                  'recommendations'
                )
        }
      },
      message: `Retrieved profile for user **${ctx.input.userId ?? ctx.input.amplitudeId}**.`
    };
  })
  .build();
