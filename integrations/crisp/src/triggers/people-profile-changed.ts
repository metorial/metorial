import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let peopleProfileChanged = SlateTrigger.create(spec, {
  name: 'People Profile Changed',
  key: 'people_profile_changed',
  description:
    'Triggers when a contact profile is created or updated in the Crisp CRM. Polls for recently updated profiles.'
})
  .input(
    z.object({
      peopleId: z.string(),
      email: z.string().optional(),
      nickname: z.string().optional(),
      updatedAt: z.string()
    })
  )
  .output(
    z.object({
      peopleId: z.string().describe('People profile ID'),
      email: z.string().optional().describe('Contact email'),
      nickname: z.string().optional().describe('Contact nickname'),
      updatedAt: z.string().describe('When the profile was last updated')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token, websiteId: ctx.config.websiteId });

      let profiles = await client.listPeopleProfiles({ pageNumber: 1 });

      let lastSeenTimestamp = ctx.state?.lastSeenTimestamp as string | undefined;
      let inputs: any[] = [];

      for (let p of profiles || []) {
        let updatedAt = p.updated_at ? String(p.updated_at) : undefined;

        if (lastSeenTimestamp && updatedAt && updatedAt <= lastSeenTimestamp) {
          break;
        }

        inputs.push({
          peopleId: p.people_id,
          email: p.email,
          nickname: p.person?.nickname,
          updatedAt: updatedAt || ''
        });
      }

      let newTimestamp = profiles?.[0]?.updated_at
        ? String(profiles[0].updated_at)
        : lastSeenTimestamp;

      return {
        inputs,
        updatedState: {
          lastSeenTimestamp: newTimestamp
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'people.updated',
        id: `${ctx.input.peopleId}-${ctx.input.updatedAt}`,
        output: {
          peopleId: ctx.input.peopleId,
          email: ctx.input.email,
          nickname: ctx.input.nickname,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
