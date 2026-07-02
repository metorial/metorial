import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAthleteProfile = SlateTool.create(spec, {
  name: 'Get Athlete Profile',
  key: 'get_athlete_profile',
  description: `Retrieve the authenticated athlete's full profile, including personal details, training zones (heart rate and power), and aggregate statistics across sport types (ride, run, swim). Optionally include zones and stats alongside the profile.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeZones: z.boolean().optional().describe('Include heart rate and power zones'),
      includeStats: z.boolean().optional().describe('Include aggregate activity statistics')
    })
  )
  .output(
    z.object({
      athleteId: z.number().describe('Unique athlete identifier'),
      username: z.string().nullable().optional().describe('Athlete username'),
      firstName: z.string().nullable().optional().describe('First name'),
      lastName: z.string().nullable().optional().describe('Last name'),
      city: z.string().nullable().optional().describe('City'),
      state: z.string().nullable().optional().describe('State/province'),
      country: z.string().nullable().optional().describe('Country'),
      sex: z.string().nullable().optional().describe('Gender (M or F)'),
      weight: z.number().nullable().optional().describe('Weight in kilograms'),
      profileImageUrl: z.string().nullable().optional().describe('URL to profile image'),
      createdAt: z.string().nullable().optional().describe('Account creation date'),
      followerCount: z.number().nullable().optional().describe('Number of followers'),
      friendCount: z.number().nullable().optional().describe('Number of friends'),
      zones: z.any().optional().describe('Heart rate and power zones'),
      stats: z.any().optional().describe('Aggregate statistics across sport types')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let athlete = await client.getAuthenticatedAthlete();

    let zones: any;
    let stats: any;

    if (ctx.input.includeZones) {
      zones = await client.getAthleteZones();
    }

    if (ctx.input.includeStats) {
      stats = await client.getAthleteStats(athlete.id);
    }

    return {
      output: {
        athleteId: athlete.id,
        username: athlete.username,
        firstName: athlete.firstname,
        lastName: athlete.lastname,
        city: athlete.city,
        state: athlete.state,
        country: athlete.country,
        sex: athlete.sex,
        weight: athlete.weight,
        profileImageUrl: athlete.profile,
        createdAt: athlete.created_at,
        followerCount: athlete.follower_count,
        friendCount: athlete.friend_count,
        zones,
        stats
      },
      message: `Retrieved profile for **${athlete.firstname} ${athlete.lastname}** (${athlete.username || 'no username'}).${ctx.input.includeZones ? ' Zones included.' : ''}${ctx.input.includeStats ? ' Stats included.' : ''}`
    };
  })
  .build();
