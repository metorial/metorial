import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newUpdateQueuedTrigger = SlateTrigger.create(spec, {
  name: 'New Update Queued',
  key: 'new_update_queued',
  description:
    'Triggers when a new update is added to the posting queue on any connected social media profile. Polls for newly queued updates across all profiles.'
})
  .input(
    z.object({
      updateId: z.string().describe('ID of the queued update'),
      profileId: z.string().describe('Profile ID the update is queued for'),
      profileService: z.string().describe('Social network service name'),
      text: z.string().describe('Text content of the queued update'),
      createdAt: z.number().describe('Unix timestamp when the update was created'),
      dueAt: z.number().describe('Unix timestamp when the update is scheduled to be sent'),
      dueTime: z.string().describe('Time of day the update is scheduled for'),
      day: z.string().describe('Day the update is scheduled for'),
      media: z.any().optional().describe('Attached media')
    })
  )
  .output(
    z.object({
      updateId: z.string().describe('ID of the queued update'),
      profileId: z.string().describe('Profile ID the update is queued for'),
      profileService: z.string().describe('Social network service name'),
      text: z.string().describe('Text content of the queued update'),
      createdAt: z.number().describe('Unix timestamp when the update was created'),
      dueAt: z.number().describe('Unix timestamp when the update is scheduled to be sent'),
      dueTime: z.string().describe('Time of day the update is scheduled for'),
      day: z.string().describe('Day the update is scheduled for')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let profiles = await client.getProfiles();
      let knownIds = (ctx.state?.knownUpdateIds as string[] | undefined) || [];
      let knownSet = new Set(knownIds);

      let allInputs: Array<{
        updateId: string;
        profileId: string;
        profileService: string;
        text: string;
        createdAt: number;
        dueAt: number;
        dueTime: string;
        day: string;
        media: any;
      }> = [];

      let currentIds: string[] = [];

      for (let profile of profiles) {
        let result = await client.getPendingUpdates(profile.id, { count: 50 });

        for (let update of result.updates || []) {
          currentIds.push(update.id);

          if (!knownSet.has(update.id)) {
            allInputs.push({
              updateId: update.id,
              profileId: update.profileId,
              profileService: update.profileService,
              text: update.text,
              createdAt: update.createdAt,
              dueAt: update.dueAt,
              dueTime: update.dueTime,
              day: update.day,
              media: update.media
            });
          }
        }
      }

      return {
        inputs: allInputs,
        updatedState: {
          knownUpdateIds: currentIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'update.queued',
        id: ctx.input.updateId,
        output: {
          updateId: ctx.input.updateId,
          profileId: ctx.input.profileId,
          profileService: ctx.input.profileService,
          text: ctx.input.text,
          createdAt: ctx.input.createdAt,
          dueAt: ctx.input.dueAt,
          dueTime: ctx.input.dueTime,
          day: ctx.input.day
        }
      };
    }
  })
  .build();
