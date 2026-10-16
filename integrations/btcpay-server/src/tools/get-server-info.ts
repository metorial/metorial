import { SlateTool } from 'slates';
import { z } from 'zod';
import { BTCPayClient } from '../lib/client';
import { spec } from '../spec';

export let getServerInfo = SlateTool.create(spec, {
  name: 'Get Server Info',
  key: 'get_server_info',
  description: `Retrieve information about the BTCPay Server instance, including version, supported payment methods, and current user details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      raw: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Complete server information'),
      rawCurrentUser: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Complete current user information'),
      version: z.string().optional().describe('BTCPay Server version'),
      supportedPaymentMethods: z
        .array(z.string())
        .optional()
        .describe('Supported payment methods'),
      fullySynched: z.boolean().optional().describe('Whether the server is fully synced'),
      syncStatuses: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Sync status for each crypto'),
      currentUser: z
        .object({
          userId: z.string().optional().describe('User ID'),
          email: z.string().optional().describe('User email'),
          roles: z.array(z.string()).optional().describe('User roles')
        })
        .optional()
        .describe('Currently authenticated user')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BTCPayClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let [serverInfo, user] = await Promise.all([
      client.getServerInfo(),
      client.getCurrentUser()
    ]);

    return {
      output: {
        raw: serverInfo,
        rawCurrentUser: user,
        version: serverInfo.version as string | undefined,
        supportedPaymentMethods: serverInfo.supportedPaymentMethods as string[] | undefined,
        fullySynched: serverInfo.fullySynched as boolean | undefined,
        syncStatuses: (serverInfo.syncStatuses ?? serverInfo.syncStatus) as
          | Record<string, unknown>[]
          | undefined,
        currentUser: {
          userId: user.id as string | undefined,
          email: user.email as string | undefined,
          roles: user.roles as string[] | undefined
        }
      },
      message: `BTCPay Server **v${serverInfo.version ?? 'unknown'}** — synced: **${serverInfo.fullySynched ?? 'unknown'}**. Logged in as **${user.email ?? 'unknown'}**.`
    };
  })
  .build();
