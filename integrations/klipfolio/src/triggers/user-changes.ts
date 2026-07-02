import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let userChanges = SlateTrigger.create(spec, {
  name: 'User Changes',
  key: 'user_changes',
  description: 'Detects new users added to your Klipfolio account by polling the users list.'
})
  .input(
    z.object({
      changeType: z.enum(['created']).describe('Type of change detected'),
      userId: z.string().describe('User ID'),
      firstName: z.string().describe('First name'),
      lastName: z.string().describe('Last name'),
      email: z.string().describe('Email address'),
      dateCreated: z.string().optional().describe('Creation timestamp')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('ID of the user'),
      firstName: z.string().describe('First name'),
      lastName: z.string().describe('Last name'),
      email: z.string().describe('Email address'),
      dateCreated: z.string().optional().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let result = await client.listUsers({ limit: 100 });
      let users = result?.data || [];

      let previousIds: string[] = ctx.state?.userIds || [];
      let previousIdSet = new Set(previousIds);
      let inputs: Array<{
        changeType: 'created';
        userId: string;
        firstName: string;
        lastName: string;
        email: string;
        dateCreated?: string;
      }> = [];
      let currentIds: string[] = [];

      for (let user of users) {
        currentIds.push(user.id);
        if (!previousIdSet.has(user.id)) {
          inputs.push({
            changeType: 'created',
            userId: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            dateCreated: user.date_created
          });
        }
      }

      return {
        inputs,
        updatedState: { userIds: currentIds }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `user.${ctx.input.changeType}`,
        id: `${ctx.input.userId}-${ctx.input.dateCreated || 'created'}`,
        output: {
          userId: ctx.input.userId,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          email: ctx.input.email,
          dateCreated: ctx.input.dateCreated
        }
      };
    }
  })
  .build();
