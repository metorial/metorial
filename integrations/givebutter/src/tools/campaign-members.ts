import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let memberSchema = z.object({
  memberId: z.number().describe('Unique identifier of the member'),
  firstName: z.string().nullable().describe('Member first name'),
  lastName: z.string().nullable().describe('Member last name'),
  email: z.string().nullable().describe('Member email'),
  phone: z.string().nullable().describe('Member phone'),
  picture: z.string().nullable().describe('Profile picture URL'),
  raised: z.number().nullable().describe('Amount raised by this member'),
  goal: z.number().nullable().describe('Member fundraising goal'),
  donors: z.number().nullable().describe('Number of donors'),
  items: z.number().nullable().describe('Number of items'),
  url: z.string().nullable().describe('Member fundraising URL')
});

let teamSchema = z.object({
  teamId: z.number().describe('Unique identifier of the team'),
  name: z.string().nullable().describe('Team name'),
  logo: z.string().nullable().describe('Team logo URL'),
  slug: z.string().nullable().describe('URL slug'),
  url: z.string().nullable().describe('Team URL'),
  raised: z.number().nullable().describe('Amount raised'),
  goal: z.number().nullable().describe('Team goal'),
  supporters: z.number().nullable().describe('Number of supporters'),
  members: z.number().nullable().describe('Number of team members')
});

let listCampaignMembersOutputSchema = z.object({
  members: z.array(memberSchema).describe('List of campaign members'),
  totalCount: z.number().describe('Total number of members'),
  currentPage: z.number().describe('Current page'),
  lastPage: z.number().describe('Last page')
});

export let listCampaignMembers = SlateTool.create(spec, {
  name: 'List Campaign Members',
  key: 'list_campaign_members',
  description: `Retrieve peer-to-peer fundraising members for a specific campaign. Members share custom links and receive credit for donations made through them.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.number().describe('ID of the campaign'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Items per page, from 1 to 100')
    })
  )
  .output(listCampaignMembersOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listMembers(ctx.input.campaignId, {
      page: ctx.input.page,
      per_page: ctx.input.perPage
    });

    let members = result.data.map((m: any) => ({
      memberId: m.id,
      firstName: m.first_name,
      lastName: m.last_name,
      email: m.email,
      phone: m.phone,
      picture: m.picture,
      raised: m.raised,
      goal: m.goal,
      donors: m.donors,
      items: m.items,
      url: m.url
    }));

    return {
      output: client.output(listCampaignMembersOutputSchema, {
        members,
        totalCount: result.meta.total,
        currentPage: result.meta.current_page,
        lastPage: result.meta.last_page
      }),
      message: client.publicData(
        `Found **${result.meta.total}** members for campaign ${ctx.input.campaignId} (page ${result.meta.current_page} of ${result.meta.last_page}).`
      )
    };
  })
  .build();

let listCampaignTeamsOutputSchema = z.object({
  teams: z.array(teamSchema).describe('List of campaign teams'),
  totalCount: z.number().describe('Total number of teams'),
  currentPage: z.number().describe('Current page'),
  lastPage: z.number().describe('Last page')
});

export let listCampaignTeams = SlateTool.create(spec, {
  name: 'List Campaign Teams',
  key: 'list_campaign_teams',
  description: `Retrieve fundraising teams for a specific campaign. Teams support leaderboard-style multi-team fundraising competitions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.number().describe('ID of the campaign'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Items per page, from 1 to 100')
    })
  )
  .output(listCampaignTeamsOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listTeams(ctx.input.campaignId, {
      page: ctx.input.page,
      per_page: ctx.input.perPage
    });

    let teams = result.data.map((t: any) => ({
      teamId: t.id,
      name: t.name,
      logo: t.logo,
      slug: t.slug,
      url: t.url,
      raised: t.raised,
      goal: t.goal,
      supporters: t.supporters,
      members: t.members
    }));

    return {
      output: client.output(listCampaignTeamsOutputSchema, {
        teams,
        totalCount: result.meta.total,
        currentPage: result.meta.current_page,
        lastPage: result.meta.last_page
      }),
      message: client.publicData(
        `Found **${result.meta.total}** teams for campaign ${ctx.input.campaignId} (page ${result.meta.current_page} of ${result.meta.last_page}).`
      )
    };
  })
  .build();
