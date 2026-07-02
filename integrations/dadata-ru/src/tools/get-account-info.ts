import { SlateTool } from 'slates';
import { z } from 'zod';
import { ProfileClient } from '../lib/client';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description: `Retrieves DaData account information including current balance, daily usage statistics, and data freshness versions for all reference directories.
Useful for monitoring API consumption and checking that reference data is up to date.`,
  constraints: ['Requires both API Key and Secret Key.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      include: z
        .array(z.enum(['balance', 'stats', 'versions']))
        .optional()
        .describe('Which data to include (default: all)')
    })
  )
  .output(
    z.object({
      balance: z.number().nullable().describe('Account balance in rubles'),
      stats: z
        .object({
          date: z.string().nullable().describe('Stats date'),
          servicesUsed: z
            .record(z.string(), z.number())
            .nullable()
            .describe('Requests consumed today per service'),
          servicesRemaining: z
            .record(z.string(), z.number())
            .nullable()
            .describe('Estimated remaining requests per service')
        })
        .nullable()
        .describe('Daily usage statistics'),
      versions: z
        .record(z.string(), z.unknown())
        .nullable()
        .describe('Data freshness versions for reference directories')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ProfileClient({
      token: ctx.auth.token,
      secretKey: ctx.auth.secretKey
    });

    let include = ctx.input.include || ['balance', 'stats', 'versions'];
    let balance: number | null = null;
    let stats: any = null;
    let versions: any = null;

    let promises: Promise<void>[] = [];

    if (include.includes('balance')) {
      promises.push(
        client.getBalance().then(data => {
          balance = data.balance ?? null;
        })
      );
    }

    if (include.includes('stats')) {
      promises.push(
        client.getDailyStats().then(data => {
          stats = {
            date: data.date ?? null,
            servicesUsed: data.services ?? null,
            servicesRemaining: data.remaining ?? null
          };
        })
      );
    }

    if (include.includes('versions')) {
      promises.push(
        client.getVersions().then(data => {
          versions = data ?? null;
        })
      );
    }

    await Promise.all(promises);

    let messageParts: string[] = [];
    if (balance !== null) messageParts.push(`Balance: **${balance} ₽**`);
    if (stats?.date) messageParts.push(`Stats date: ${stats.date}`);

    return {
      output: { balance, stats, versions },
      message: messageParts.length > 0 ? messageParts.join('. ') : 'Account info retrieved.'
    };
  })
  .build();
