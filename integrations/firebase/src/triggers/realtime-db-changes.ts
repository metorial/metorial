import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { RealtimeDbClient } from '../lib/client';
import { firebaseActionScopes } from '../scopes';
import { spec } from '../spec';

export let realtimeDbChanges = SlateTrigger.create(spec, {
  name: 'Realtime Database Changes',
  key: 'realtime_db_changes',
  description:
    'Monitors a path in the Firebase Realtime Database for data changes by polling. Detects when new child keys are added or existing values are modified at the monitored path.'
})
  .scopes(firebaseActionScopes.realtimeDbChanges)
  .input(
    z.object({
      changeType: z.enum(['created', 'updated']).describe('Type of change detected'),
      path: z.string().describe('Database path of the changed data'),
      childKey: z.string().describe('Key of the changed child node'),
      data: z.any().describe('Current data at the changed path')
    })
  )
  .output(
    z.object({
      path: z.string().describe('Database path of the changed data'),
      childKey: z.string().describe('Key of the changed child node'),
      data: z.any().describe('Current data at the changed path')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      if (!ctx.config.databaseUrl) {
        return { inputs: [] };
      }

      let state = ctx.state || {};
      let monitorPath = state.monitorPath || '/';
      let previousSnapshot = state.previousSnapshot || null;
      let isFirstPoll = state.isFirstPoll !== false;

      let client = new RealtimeDbClient({
        token: ctx.auth.token,
        databaseUrl: ctx.config.databaseUrl
      });

      let currentData = await client.getData(monitorPath, { shallow: false });

      let inputs: Array<{
        changeType: 'created' | 'updated';
        path: string;
        childKey: string;
        data: any;
      }> = [];

      if (
        !isFirstPoll &&
        currentData &&
        typeof currentData === 'object' &&
        !Array.isArray(currentData)
      ) {
        let previousKeys = previousSnapshot ? Object.keys(previousSnapshot) : [];
        let currentKeys = Object.keys(currentData);

        for (let key of currentKeys) {
          if (!previousKeys.includes(key)) {
            inputs.push({
              changeType: 'created',
              path: `${monitorPath}/${key}`,
              childKey: key,
              data: currentData[key]
            });
          } else if (
            JSON.stringify(previousSnapshot?.[key]) !== JSON.stringify(currentData[key])
          ) {
            inputs.push({
              changeType: 'updated',
              path: `${monitorPath}/${key}`,
              childKey: key,
              data: currentData[key]
            });
          }
        }
      }

      return {
        inputs,
        updatedState: {
          monitorPath,
          previousSnapshot:
            currentData && typeof currentData === 'object' ? currentData : null,
          isFirstPoll: false
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `realtime_db.${ctx.input.changeType}`,
        id: `${ctx.input.path}-${Date.now()}`,
        output: {
          path: ctx.input.path,
          childKey: ctx.input.childKey,
          data: ctx.input.data
        }
      };
    }
  })
  .build();
