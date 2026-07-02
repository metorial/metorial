import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSportsTool = SlateTool.create(spec, {
  name: 'List Sports',
  key: 'list_sports',
  description: `Retrieve all available sports and leagues from The Odds API. Returns sport keys, group names, titles, and whether each sport is active or supports outrights/futures markets.
Use the returned sport key as the **sport** parameter in other tools.`,
  constraints: ['This endpoint does not count against the usage quota.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeInactive: z
        .boolean()
        .optional()
        .describe('Set to true to include out-of-season sports')
    })
  )
  .output(
    z.object({
      sports: z.array(
        z.object({
          sportKey: z.string().describe('Unique sport identifier used in other endpoints'),
          group: z.string().describe('Sport category (e.g. "American Football", "Soccer")'),
          title: z.string().describe('Display name (e.g. "NFL", "EPL")'),
          description: z.string().describe('Short description of the sport/league'),
          active: z.boolean().describe('Whether the sport is currently in season'),
          hasOutrights: z
            .boolean()
            .describe('Whether the sport supports outright/futures markets')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let sports = await client.getSports(ctx.input.includeInactive);

    let mapped = sports.map(s => ({
      sportKey: s.key,
      group: s.group,
      title: s.title,
      description: s.description,
      active: s.active,
      hasOutrights: s.has_outrights
    }));

    return {
      output: { sports: mapped },
      message: `Found **${mapped.length}** sports/leagues. ${ctx.input.includeInactive ? 'Includes inactive sports.' : 'Showing in-season only.'}`
    };
  })
  .build();
