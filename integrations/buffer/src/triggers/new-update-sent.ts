import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newUpdateSentTrigger = SlateTrigger.create(spec, {
  name: 'New Update Sent',
  key: 'new_update_sent',
  description:
    'Triggers when an update has been sent (published) on any connected social media profile. Polls for newly sent updates across all profiles.'
})
  .input(
    z.object({
      updateId: z.string().describe('ID of the sent update'),
      profileId: z.string().describe('Profile ID the update was sent from'),
      profileService: z.string().describe('Social network service name'),
      text: z.string().describe('Text content of the sent update'),
      sentAt: z.number().describe('Unix timestamp when the update was sent'),
      createdAt: z.number().describe('Unix timestamp when the update was created'),
      serviceUpdateId: z.string().describe('ID of the update on the social network'),
      statistics: z.record(z.string(), z.number()).describe('Engagement statistics'),
      media: z.any().optional().describe('Attached media')
    })
  )
  .output(
    z.object({
      updateId: z.string().describe('ID of the sent update'),
      profileId: z.string().describe('Profile ID the update was sent from'),
      profileService: z.string().describe('Social network service name'),
      text: z.string().describe('Text content of the sent update'),
      sentAt: z.number().describe('Unix timestamp when the update was sent'),
      createdAt: z.number().describe('Unix timestamp when the update was created'),
      serviceUpdateId: z.string().describe('ID of the update on the social network'),
      statistics: z.record(z.string(), z.number()).describe('Engagement statistics')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let profiles = await client.getProfiles();
      let lastPollTimestamp = ctx.state?.lastPollTimestamp as number | undefined;
      let now = Math.floor(Date.now() / 1000);

      let allInputs: Array<{
        updateId: string;
        profileId: string;
        profileService: string;
        text: string;
        sentAt: number;
        createdAt: number;
        serviceUpdateId: string;
        statistics: Record<string, number>;
        media: any;
      }> = [];

      for (let profile of profiles) {
        let result = await client.getSentUpdates(profile.id, {
          since: lastPollTimestamp ? String(lastPollTimestamp) : undefined,
          count: 25
        });

        for (let update of result.updates || []) {
          if (!lastPollTimestamp || update.sentAt > lastPollTimestamp) {
            allInputs.push({
              updateId: update.id,
              profileId: update.profileId,
              profileService: update.profileService,
              text: update.text,
              sentAt: update.sentAt,
              createdAt: update.createdAt,
              serviceUpdateId: update.serviceUpdateId,
              statistics: update.statistics || {},
              media: update.media
            });
          }
        }
      }

      return {
        inputs: allInputs,
        updatedState: {
          lastPollTimestamp: now
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'update.sent',
        id: ctx.input.updateId,
        output: {
          updateId: ctx.input.updateId,
          profileId: ctx.input.profileId,
          profileService: ctx.input.profileService,
          text: ctx.input.text,
          sentAt: ctx.input.sentAt,
          createdAt: ctx.input.createdAt,
          serviceUpdateId: ctx.input.serviceUpdateId,
          statistics: ctx.input.statistics
        }
      };
    }
  })
  .build();
