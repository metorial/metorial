import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listClubs = SlateTool.create(spec, {
  name: 'List Clubs',
  key: 'list_clubs',
  description: `List clubs the authenticated athlete is a member of. Returns club summaries with name, sport type, location, and member count.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default 1)'),
      perPage: z.number().optional().describe('Number of clubs per page (default 30)')
    })
  )
  .output(
    z.object({
      clubs: z
        .array(
          z.object({
            clubId: z.number().describe('Club identifier'),
            name: z.string().describe('Club name'),
            sportType: z.string().nullable().optional().describe('Club sport type'),
            city: z.string().nullable().optional().describe('City'),
            state: z.string().nullable().optional().describe('State'),
            country: z.string().nullable().optional().describe('Country'),
            memberCount: z.number().optional().describe('Number of members'),
            profileImageUrl: z.string().nullable().optional().describe('Profile image URL')
          })
        )
        .describe('List of clubs'),
      count: z.number().describe('Number of clubs returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let clubs = await client.listAthleteClubs({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let mapped = clubs.map((c: any) => ({
      clubId: c.id,
      name: c.name,
      sportType: c.sport_type,
      city: c.city,
      state: c.state,
      country: c.country,
      memberCount: c.member_count,
      profileImageUrl: c.profile_medium
    }));

    return {
      output: {
        clubs: mapped,
        count: mapped.length
      },
      message: `Found **${mapped.length}** clubs.`
    };
  })
  .build();
