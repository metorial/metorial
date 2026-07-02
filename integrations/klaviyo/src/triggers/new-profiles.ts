import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let newProfiles = SlateTrigger.create(spec, {
  name: 'New Profiles',
  key: 'new_profiles',
  description:
    '[Polling fallback] Polls for newly created customer profiles in Klaviyo. Detects when new contacts are added to the account.'
})
  .input(
    z.object({
      profileId: z.string().describe('Profile ID'),
      email: z.string().optional().describe('Email address'),
      phoneNumber: z.string().optional().describe('Phone number'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      created: z.string().optional().describe('Profile creation timestamp')
    })
  )
  .output(
    z.object({
      profileId: z.string().describe('Profile ID'),
      email: z.string().optional().describe('Email address'),
      phoneNumber: z.string().optional().describe('Phone number'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      organization: z.string().optional().describe('Organization'),
      title: z.string().optional().describe('Job title'),
      location: z.any().optional().describe('Location data'),
      properties: z.record(z.string(), z.any()).optional().describe('Custom properties'),
      created: z.string().optional().describe('Profile creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);

      let state = ctx.state as { lastTimestamp?: string; lastSeenIds?: string[] } | undefined;
      let lastTimestamp = state?.lastTimestamp;
      let lastSeenIds = state?.lastSeenIds ?? [];

      let filter: string | undefined;
      if (lastTimestamp) {
        filter = `greater-than(created,${lastTimestamp})`;
      }

      let result = await client.getProfiles({
        filter,
        sort: '-created',
        pageSize: 50
      });

      let newProfiles = result.data.filter(p => !lastSeenIds.includes(p.id ?? ''));

      let inputs = newProfiles.map(p => ({
        profileId: p.id ?? '',
        email: p.attributes?.email ?? undefined,
        phoneNumber: p.attributes?.phone_number ?? undefined,
        firstName: p.attributes?.first_name ?? undefined,
        lastName: p.attributes?.last_name ?? undefined,
        created: p.attributes?.created ?? undefined
      }));

      let updatedTimestamp =
        newProfiles.length > 0
          ? (newProfiles[0]?.attributes?.created ?? lastTimestamp)
          : lastTimestamp;

      let updatedSeenIds = newProfiles.map(p => p.id ?? '').slice(0, 100);

      return {
        inputs,
        updatedState: {
          lastTimestamp: updatedTimestamp ?? new Date().toISOString(),
          lastSeenIds: updatedSeenIds
        }
      };
    },

    handleEvent: async ctx => {
      let client = createClient(ctx);

      // Fetch full profile data for enriched output
      let profile: any = null;
      try {
        let result = await client.getProfile(ctx.input.profileId);
        profile = Array.isArray(result.data) ? result.data[0] : result.data;
      } catch {
        // Profile may no longer be accessible
      }

      return {
        type: 'profile.created',
        id: ctx.input.profileId,
        output: {
          profileId: ctx.input.profileId,
          email: profile?.attributes?.email ?? ctx.input.email,
          phoneNumber: profile?.attributes?.phone_number ?? ctx.input.phoneNumber,
          firstName: profile?.attributes?.first_name ?? ctx.input.firstName,
          lastName: profile?.attributes?.last_name ?? ctx.input.lastName,
          organization: profile?.attributes?.organization ?? undefined,
          title: profile?.attributes?.title ?? undefined,
          location: profile?.attributes?.location ?? undefined,
          properties: profile?.attributes?.properties ?? undefined,
          created: profile?.attributes?.created ?? ctx.input.created
        }
      };
    }
  })
  .build();
