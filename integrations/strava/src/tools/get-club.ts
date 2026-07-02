import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getClub = SlateTool.create(spec, {
  name: 'Get Club',
  key: 'get_club',
  description: `Retrieve details about a specific club, optionally including its members, recent activities, and administrators.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      clubId: z.number().describe('The club identifier'),
      includeMembers: z.boolean().optional().describe('Include club members list'),
      includeActivities: z.boolean().optional().describe('Include recent club activities'),
      includeAdmins: z.boolean().optional().describe('Include club administrators')
    })
  )
  .output(
    z.object({
      clubId: z.number().describe('Club identifier'),
      name: z.string().describe('Club name'),
      description: z.string().nullable().optional().describe('Club description'),
      sportType: z.string().nullable().optional().describe('Club sport type'),
      city: z.string().nullable().optional().describe('City'),
      state: z.string().nullable().optional().describe('State'),
      country: z.string().nullable().optional().describe('Country'),
      memberCount: z.number().optional().describe('Number of members'),
      url: z.string().nullable().optional().describe('Club URL slug'),
      coverPhotoUrl: z.string().nullable().optional().describe('Cover photo URL'),
      profileImageUrl: z.string().nullable().optional().describe('Profile image URL'),
      members: z.array(z.any()).optional().describe('Club members'),
      recentActivities: z.array(z.any()).optional().describe('Recent club activities'),
      admins: z.array(z.any()).optional().describe('Club administrators')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let club = await client.getClub(ctx.input.clubId);

    let members: any[] | undefined;
    let recentActivities: any[] | undefined;
    let admins: any[] | undefined;

    if (ctx.input.includeMembers) {
      members = await client.listClubMembers(ctx.input.clubId);
    }

    if (ctx.input.includeActivities) {
      recentActivities = await client.listClubActivities(ctx.input.clubId);
    }

    if (ctx.input.includeAdmins) {
      admins = await client.listClubAdmins(ctx.input.clubId);
    }

    return {
      output: {
        clubId: club.id,
        name: club.name,
        description: club.description,
        sportType: club.sport_type,
        city: club.city,
        state: club.state,
        country: club.country,
        memberCount: club.member_count,
        url: club.url,
        coverPhotoUrl: club.cover_photo,
        profileImageUrl: club.profile_medium,
        members,
        recentActivities,
        admins
      },
      message: `Retrieved club **${club.name}** with ${club.member_count || 0} members.`
    };
  })
  .build();
