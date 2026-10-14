import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMyNetwork = SlateTool.create(spec, {
  name: 'Get My Network',
  key: 'get_my_network',
  description: `Retrieve creator profiles from your My Network section. Pull in influencer data programmatically with optional filtering by report unlock date. Uses cursor-based pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().min(1).max(100).optional().describe('Results per page (1-100)'),
      reportUnlockedFrom: z
        .string()
        .optional()
        .describe('Filter by report unlock date start (YYYY-MM-DD)'),
      reportUnlockedTo: z
        .string()
        .optional()
        .describe('Filter by report unlock date end (YYYY-MM-DD)'),
      cursor: z
        .number()
        .optional()
        .describe('Numeric pagination cursor from previous response'),
      cursorToken: z
        .string()
        .optional()
        .describe('Opaque string cursor from nextCursorToken. Use instead of cursor.'),
      creatorIds: z
        .array(z.string())
        .max(1000)
        .optional()
        .describe('Numeric creator IDs to retrieve, up to 1000.'),
      creatorAccounts: z
        .array(
          z.object({
            socialNetwork: z.enum([
              'instagram',
              'youtube',
              'tiktok',
              'twitter',
              'twitch',
              'snapchat'
            ]),
            socialId: z.string().describe('Account ID on the selected social network')
          })
        )
        .max(100)
        .optional()
        .describe('Social accounts to look up, up to 100.')
    })
  )
  .output(
    z.object({
      creators: z
        .array(z.any())
        .describe(
          'Array of creator profiles with contact info, social networks, and statuses'
        ),
      nextCursor: z.number().optional().describe('Numeric cursor for next page of results'),
      nextCursorToken: z
        .string()
        .optional()
        .describe('String cursor for next page. Pass it as cursorToken.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      apiVersion: ctx.config.apiVersion
    });

    if (ctx.input.cursor !== undefined && ctx.input.cursorToken !== undefined) {
      throw createApiServiceError('Provide cursor or cursorToken, not both.');
    }
    if (ctx.input.creatorIds?.some(id => !/^\d+$/.test(id))) {
      throw createApiServiceError('Each creatorIds value must contain only digits.');
    }

    let response = await client.getCreators({
      limit: ctx.input.limit,
      reportUnlockedFrom: ctx.input.reportUnlockedFrom,
      reportUnlockedTo: ctx.input.reportUnlockedTo,
      cursor: ctx.input.cursorToken ?? ctx.input.cursor,
      creatorIds: ctx.input.creatorIds?.join(','),
      creatorAccounts: ctx.input.creatorAccounts
        ? JSON.stringify(
            ctx.input.creatorAccounts.map(account => ({
              social_type: account.socialNetwork,
              social_id: account.socialId
            }))
          )
        : undefined
    });

    let result = response?.result ?? response;
    let creators = result?.data ?? result?.creators ?? [];
    let nextCursor = typeof result?.next_cursor === 'number' ? result.next_cursor : undefined;
    let nextCursorToken =
      typeof result?.next_cursor === 'string' ? result.next_cursor : undefined;

    return {
      output: {
        creators: Array.isArray(creators) ? creators : [],
        nextCursor,
        nextCursorToken
      },
      message: `Retrieved **${Array.isArray(creators) ? creators.length : 0}** creator(s) from My Network.`
    };
  })
  .build();
