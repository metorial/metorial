import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { OwlClient } from '../lib/client';
import { spec } from '../spec';

export let newUsers = SlateTrigger.create(spec, {
  name: 'New User Created',
  key: 'new_users',
  description:
    'Triggers when a new project user is created. Polls for newly added users in the project.'
})
  .input(
    z.object({
      userId: z.string().describe('User ID'),
      email: z.string().optional().describe('User email'),
      fullName: z.string().optional().describe('User full name'),
      externalId: z.string().optional().describe('External identifier'),
      walletAddress: z.string().optional().describe('User wallet address')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('Owl Protocol user ID'),
      email: z.string().optional().describe('User email address'),
      fullName: z.string().optional().describe('User full name'),
      externalId: z.string().optional().describe('External identifier'),
      walletAddress: z.string().optional().describe('User wallet address')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new OwlClient({ token: ctx.auth.token });

      let result = await client.listUsers();
      let users = Array.isArray(result) ? result : (result?.items ?? []);

      let knownIds: string[] = (ctx.state?.knownUserIds as string[]) ?? [];
      let knownSet = new Set(knownIds);

      let newUsers = users.filter((u: { userId?: string; id?: string }) => {
        let uid = u.userId ?? u.id;
        return uid && !knownSet.has(uid);
      });

      let allIds = users
        .map((u: { userId?: string; id?: string }) => u.userId ?? u.id)
        .filter((id: string | undefined): id is string => !!id);

      return {
        inputs: newUsers.map(
          (u: {
            userId?: string;
            id?: string;
            email?: string;
            fullName?: string;
            externalId?: string;
            walletAddress?: string;
            safeAddress?: string;
          }) => ({
            userId: (u.userId ?? u.id)!,
            email: u.email,
            fullName: u.fullName,
            externalId: u.externalId,
            walletAddress: u.walletAddress ?? u.safeAddress
          })
        ),
        updatedState: {
          knownUserIds: allIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'user.created',
        id: ctx.input.userId,
        output: {
          userId: ctx.input.userId,
          email: ctx.input.email,
          fullName: ctx.input.fullName,
          externalId: ctx.input.externalId,
          walletAddress: ctx.input.walletAddress
        }
      };
    }
  })
  .build();
