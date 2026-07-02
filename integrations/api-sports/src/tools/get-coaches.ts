import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let careerEntrySchema = z.object({
  teamId: z.number().nullable().describe('Team ID'),
  teamName: z.string().nullable().describe('Team name'),
  teamLogo: z.string().nullable().describe('Team logo URL'),
  start: z.string().nullable().describe('Start date'),
  end: z.string().nullable().describe('End date')
});

let coachSchema = z.object({
  coachId: z.number().nullable().describe('Coach ID'),
  name: z.string().nullable().describe('Coach name'),
  firstName: z.string().nullable().describe('First name'),
  lastName: z.string().nullable().describe('Last name'),
  age: z.number().nullable().describe('Age'),
  nationality: z.string().nullable().describe('Nationality'),
  photo: z.string().nullable().describe('Coach photo URL'),
  teamId: z.number().nullable().describe('Current team ID'),
  teamName: z.string().nullable().describe('Current team name'),
  career: z.array(careerEntrySchema).describe('Career history')
});

export let getCoachesTool = SlateTool.create(spec, {
  name: 'Get Coaches',
  key: 'get_coaches',
  description: `Retrieve football coach information including career history, photos, and biographical data. Search by name or filter by team to find coaching staff.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      coachId: z.number().optional().describe('Get a specific coach by ID'),
      team: z.number().optional().describe('Filter by team ID'),
      search: z.string().optional().describe('Search by coach name (min 3 characters)')
    })
  )
  .output(
    z.object({
      coaches: z.array(coachSchema),
      count: z.number().describe('Number of coaches returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, sport: 'football' });

    let data = await client.getCoaches({
      coachId: ctx.input.coachId,
      team: ctx.input.team,
      search: ctx.input.search
    });

    let results = (data.response ?? []).map((item: any) => ({
      coachId: item.id ?? null,
      name: item.name ?? null,
      firstName: item.firstname ?? null,
      lastName: item.lastname ?? null,
      age: item.age ?? null,
      nationality: item.nationality ?? null,
      photo: item.photo ?? null,
      teamId: item.team?.id ?? null,
      teamName: item.team?.name ?? null,
      career: (item.career ?? []).map((c: any) => ({
        teamId: c.team?.id ?? null,
        teamName: c.team?.name ?? null,
        teamLogo: c.team?.logo ?? null,
        start: c.start ?? null,
        end: c.end ?? null
      }))
    }));

    return {
      output: {
        coaches: results,
        count: results.length
      },
      message: `Found **${results.length}** coach(es)${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}.`
    };
  })
  .build();
