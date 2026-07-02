import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { createPendoClient } from './helpers';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve an account record from Pendo by account ID. Returns account metadata including custom fields, first and last visit timestamps, and associated visitor information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: z.string().describe('The unique account ID in Pendo')
    })
  )
  .output(
    z.object({
      accountId: z.string().describe('The account ID'),
      metadata: z
        .any()
        .optional()
        .describe('Account metadata including auto and custom fields'),
      firstVisit: z.string().optional().describe('Timestamp of the first visit'),
      lastVisit: z.string().optional().describe('Timestamp of the last visit'),
      visitorCount: z.number().optional().describe('Number of visitors in this account'),
      raw: z.any().describe('Full raw account record from Pendo')
    })
  )
  .handleInvocation(async ctx => {
    let client = createPendoClient(ctx);

    let account = await client.getAccount(ctx.input.accountId);

    return {
      output: {
        accountId: account.accountId || ctx.input.accountId,
        metadata: account.metadata,
        firstVisit: account.metadata?.auto?.firstvisit
          ? String(account.metadata.auto.firstvisit)
          : undefined,
        lastVisit: account.metadata?.auto?.lastvisit
          ? String(account.metadata.auto.lastvisit)
          : undefined,
        visitorCount: account.visitorCount,
        raw: account
      },
      message: `Retrieved account **${ctx.input.accountId}** from Pendo.`
    };
  })
  .build();
