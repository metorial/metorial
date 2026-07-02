import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let onCallChange = SlateTrigger.create(spec, {
  name: 'On-Call Change',
  key: 'on_call_change',
  description:
    '[Polling fallback] Fires when the on-call user changes for any team. Polls the current on-call roster and detects changes.'
})
  .input(
    z.object({
      teamName: z.string().describe('Name of the team where on-call changed'),
      teamSlug: z.string().describe('Slug of the team'),
      previousOnCallUsers: z.array(z.string()).describe('Previously on-call users'),
      currentOnCallUsers: z.array(z.string()).describe('Currently on-call users')
    })
  )
  .output(
    z.object({
      teamName: z.string().describe('Team name'),
      teamSlug: z.string().describe('Team slug'),
      previousOnCallUsers: z.array(z.string()).describe('Users who were previously on-call'),
      currentOnCallUsers: z.array(z.string()).describe('Users who are now on-call')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        apiId: ctx.auth.apiId,
        token: ctx.auth.token
      });

      let data = await client.getCurrentOnCall();
      let teamsOnCall: any[] = data?.teamsOnCall ?? [];

      let previousState: Record<string, string[]> = ctx.state?.onCallByTeam ?? {};
      let inputs: any[] = [];

      let currentState: Record<string, string[]> = {};

      for (let team of teamsOnCall) {
        let teamSlug = team?.team?.slug ?? '';
        let teamName = team?.team?.name ?? teamSlug;
        let onCallUsers: string[] = [];

        for (let oncall of team?.oncallNow ?? []) {
          for (let user of oncall?.users ?? []) {
            let username = user?.onCalluser?.username ?? '';
            if (username) onCallUsers.push(username);
          }
        }

        onCallUsers.sort();
        currentState[teamSlug] = onCallUsers;

        let previousUsers = previousState[teamSlug] ?? [];
        previousUsers.sort();

        let hasChanged = JSON.stringify(previousUsers) !== JSON.stringify(onCallUsers);

        if (hasChanged && Object.keys(previousState).length > 0) {
          inputs.push({
            teamName,
            teamSlug,
            previousOnCallUsers: previousUsers,
            currentOnCallUsers: onCallUsers
          });
        }
      }

      return {
        inputs,
        updatedState: {
          onCallByTeam: currentState
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'on_call.changed',
        id: `${ctx.input.teamSlug}-${ctx.input.currentOnCallUsers.join(',')}-${Date.now()}`,
        output: {
          teamName: ctx.input.teamName,
          teamSlug: ctx.input.teamSlug,
          previousOnCallUsers: ctx.input.previousOnCallUsers,
          currentOnCallUsers: ctx.input.currentOnCallUsers
        }
      };
    }
  })
  .build();
