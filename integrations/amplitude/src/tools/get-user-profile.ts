import { SlateTool } from 'slates';
import { z } from 'zod';
import { AmplitudeClient } from '../lib/client';
import { spec } from '../spec';

export let getUserProfileTool = SlateTool.create(spec, {
  name: 'Get User Profile',
  key: 'get_user_profile',
  description: `Retrieve a user's profile from Amplitude, including user properties, computed user properties, cohort memberships, and recommendations. Look up by user ID or Amplitude ID.`,
  constraints: ['Not available for EU data region customers.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
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
            .record(z.string(), z.any())
            .optional()
            .describe('User properties.'),
          computedUserProperties: z
            .record(z.string(), z.any())
            .optional()
            .describe('Computed user properties from Amplitude.'),
          cohortIds: z
            .array(z.string())
            .optional()
            .describe('List of cohort IDs the user belongs to.'),
          recommendations: z
            .array(z.any())
            .optional()
            .describe('Personalized recommendations for the user.')
        })
        .describe('User profile data.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AmplitudeClient({
      apiKey: ctx.auth.apiKey,
      secretKey: ctx.auth.secretKey,
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.getUserProfile({
      userId: ctx.input.userId,
      amplitudeId: ctx.input.amplitudeId
    });

    let profileData = result.userData ?? result;

    return {
      output: {
        userData: {
          userId: profileData.user_id ?? ctx.input.userId,
          amplitudeId: profileData.amp_id ?? ctx.input.amplitudeId,
          userProperties: profileData.user_properties,
          computedUserProperties: profileData.computed_user_properties,
          cohortIds: profileData.cohort_ids,
          recommendations: profileData.recommendations
        }
      },
      message: `Retrieved profile for user **${ctx.input.userId ?? ctx.input.amplitudeId}**.`
    };
  })
  .build();
