import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { BackendlessClient } from '../lib/client';
import { spec } from '../spec';

export let newUser = SlateTrigger.create(spec, {
  name: 'New User Registered',
  key: 'new_user',
  description:
    'Triggers when a new user is registered in the Backendless Users table. Polls for recently created user accounts.'
})
  .input(
    z.object({
      userId: z.string().describe('The objectId of the new user'),
      user: z.record(z.string(), z.unknown()).describe('The full user record')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('The objectId of the new user'),
      email: z.string().optional().describe('Email address of the new user'),
      userName: z.string().optional().describe('Name of the new user'),
      createdAt: z.string().optional().describe('ISO timestamp when the user was registered'),
      user: z
        .record(z.string(), z.unknown())
        .describe('The complete user record including all properties')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new BackendlessClient({
        applicationId: ctx.auth.applicationId,
        token: ctx.auth.token,
        subdomain: ctx.config.subdomain,
        region: ctx.config.region
      });

      let lastPollTime = (ctx.state?.lastPollTime as number) || Date.now() - 60000;

      let inputs: Array<{
        userId: string;
        user: Record<string, unknown>;
      }> = [];

      let newLastPollTime = lastPollTime;

      try {
        let newUsers = await client.getUsers({
          where: `created > ${lastPollTime}`,
          sortBy: ['created'],
          pageSize: 100
        });

        for (let user of newUsers) {
          let createdTs = user.created as number;
          inputs.push({
            userId: user.objectId as string,
            user
          });
          if (createdTs > newLastPollTime) {
            newLastPollTime = createdTs;
          }
        }
      } catch (err) {
        ctx.error(`Failed to poll for new users: ${String(err)}`);
      }

      return {
        inputs,
        updatedState: {
          lastPollTime: newLastPollTime
        }
      };
    },

    handleEvent: async ctx => {
      let created = ctx.input.user.created as number | undefined;

      return {
        type: 'user.registered',
        id: `user-${ctx.input.userId}-${created || Date.now()}`,
        output: {
          userId: ctx.input.userId,
          email: (ctx.input.user.email as string) || undefined,
          userName: (ctx.input.user.name as string) || undefined,
          createdAt: created ? new Date(created).toISOString() : undefined,
          user: ctx.input.user
        }
      };
    }
  })
  .build();
