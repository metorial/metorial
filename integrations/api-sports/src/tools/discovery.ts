import { SlateTool } from 'slates';
import { z } from 'zod';
import { sportSchema } from '../config';
import { Client } from '../lib/client';
import { spec } from '../spec';

const sportInput = sportSchema.optional();

export const getAccountStatusTool = SlateTool.create(spec, {
  key: 'get_account_status',
  name: 'Get Account Status',
  description:
    'Retrieve the authenticated account identity, subscription and request usage for a sport API.',
  tags: { readOnly: true }
})
  .input(z.object({ sport: sportInput }))
  .output(
    z.object({
      account: z.unknown().describe('Account identity returned by API-Sports'),
      subscription: z.unknown().describe('Subscription details'),
      requests: z.unknown().describe('Current request usage and daily allowance'),
      raw: z.unknown().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    const data = await new Client({
      token: ctx.auth.token,
      sport: ctx.input.sport ?? ctx.config.sport
    }).getStatus();
    return {
      output: {
        account: data.response?.account,
        subscription: data.response?.subscription,
        requests: data.response?.requests,
        raw: data
      },
      message: 'Retrieved account status and request usage.'
    };
  })
  .build();

export const getSeasonsTool = SlateTool.create(spec, {
  key: 'get_seasons',
  name: 'Get Seasons',
  description:
    'Discover the exact season identifiers accepted by a sport API. Basketball can use split-year strings; most sports use four-digit years.',
  tags: { readOnly: true }
})
  .input(z.object({ sport: sportInput }))
  .output(z.object({ seasons: z.array(z.union([z.number(), z.string()])), raw: z.unknown() }))
  .handleInvocation(async ctx => {
    const data = await new Client({
      token: ctx.auth.token,
      sport: ctx.input.sport ?? ctx.config.sport
    }).getSeasons();
    return {
      output: { seasons: data.response, raw: data },
      message: `Retrieved ${data.response.length} available seasons.`
    };
  })
  .build();
