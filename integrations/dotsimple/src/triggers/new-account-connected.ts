import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { DotSimpleClient } from '../lib/client';
import { spec } from '../spec';

export let newAccountConnected = SlateTrigger.create(spec, {
  name: 'New Account Connected',
  key: 'new_account_connected',
  description: 'Triggers when a new social media account is connected to the workspace.'
})
  .input(
    z.object({
      accountUuid: z.string().describe('UUID of the connected account'),
      accountId: z.number().optional().describe('Numeric ID of the account'),
      name: z.string().optional().describe('Display name of the account'),
      username: z.string().optional().describe('Username on the platform'),
      provider: z.string().optional().describe('Social media provider'),
      authorized: z.boolean().optional().describe('Authorization status'),
      createdAt: z.string().optional().describe('Connection timestamp')
    })
  )
  .output(
    z.object({
      accountUuid: z.string().describe('UUID of the connected account'),
      accountId: z.number().optional().describe('Numeric ID of the account'),
      name: z.string().optional().describe('Display name of the account'),
      username: z.string().optional().describe('Username on the social platform'),
      provider: z
        .string()
        .optional()
        .describe('Social media provider (e.g. facebook_page, instagram, linkedin)'),
      authorized: z.boolean().optional().describe('Whether the account is authorized'),
      createdAt: z.string().optional().describe('When the account was connected')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new DotSimpleClient({
        token: ctx.auth.token,
        workspaceId: ctx.config.workspaceId
      });

      let state = ctx.state as { knownUuids?: string[] } | null;
      let knownUuids = new Set(state?.knownUuids ?? []);

      let result = await client.listAccounts();
      let accounts: any[] = result?.data ?? [];

      let newAccounts = accounts.filter((a: any) => !knownUuids.has(a.uuid));

      let allUuids = accounts.map((a: any) => a.uuid as string);

      return {
        inputs: newAccounts.map((a: any) => ({
          accountUuid: a.uuid,
          accountId: a.id,
          name: a.name,
          username: a.username,
          provider: a.provider,
          authorized: a.authorized,
          createdAt: a.created_at
        })),
        updatedState: {
          knownUuids: allUuids
        }
      };
    },
    handleEvent: async ctx => {
      return {
        type: 'account.connected',
        id: ctx.input.accountUuid,
        output: {
          accountUuid: ctx.input.accountUuid,
          accountId: ctx.input.accountId,
          name: ctx.input.name,
          username: ctx.input.username,
          provider: ctx.input.provider,
          authorized: ctx.input.authorized,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
