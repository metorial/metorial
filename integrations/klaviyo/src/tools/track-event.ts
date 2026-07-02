import { SlateTool } from 'slates';
import { z } from 'zod';
import { klaviyoServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let trackEvent = SlateTool.create(spec, {
  name: 'Track Event',
  key: 'track_event',
  description: `Create a custom event in Klaviyo associated with a profile. Events can trigger flows, contribute to segments, and appear in analytics.
Common use cases: tracking purchases, form submissions, quiz completions, password resets, and other custom actions.`,
  instructions: [
    'Identify the profile by either profileId or email/phoneNumber. If the profile does not exist, it will be created.',
    'The metricName defines the event type (e.g., "Placed Order", "Quiz Completed"). If the metric does not exist, it will be auto-created.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      metricName: z
        .string()
        .describe('Name of the event metric (e.g., "Placed Order", "Viewed Product")'),
      profileId: z.string().optional().describe('Profile ID to associate the event with'),
      email: z
        .string()
        .optional()
        .describe('Email to identify the profile (used if profileId not provided)'),
      phoneNumber: z.string().optional().describe('Phone number to identify the profile'),
      properties: z.record(z.string(), z.any()).optional().describe('Custom event properties'),
      value: z.number().optional().describe('Monetary value associated with the event'),
      time: z
        .string()
        .optional()
        .describe('Event timestamp in ISO 8601 format (defaults to now)'),
      uniqueId: z.string().optional().describe('Unique ID for deduplication')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the event was created successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (!ctx.input.profileId && !ctx.input.email && !ctx.input.phoneNumber) {
      throw klaviyoServiceError(
        'Provide profileId, email, or phoneNumber so Klaviyo can associate the event with a profile.'
      );
    }

    let profileData: Record<string, any> = { type: 'profile' };
    if (ctx.input.profileId) {
      profileData.id = ctx.input.profileId;
    } else {
      profileData.attributes = {};
      if (ctx.input.email) profileData.attributes.email = ctx.input.email;
      if (ctx.input.phoneNumber) profileData.attributes.phone_number = ctx.input.phoneNumber;
    }

    await client.createEvent({
      metric: {
        data: {
          type: 'metric',
          attributes: { name: ctx.input.metricName }
        }
      },
      profile: {
        data: profileData
      },
      properties: ctx.input.properties,
      value: ctx.input.value,
      time: ctx.input.time,
      unique_id: ctx.input.uniqueId
    });

    return {
      output: { success: true },
      message: `Tracked event **${ctx.input.metricName}** for profile ${ctx.input.profileId ?? ctx.input.email ?? ctx.input.phoneNumber ?? 'unknown'}`
    };
  })
  .build();
