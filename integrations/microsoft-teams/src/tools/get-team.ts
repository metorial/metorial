import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { microsoftTeamsActionScopes } from '../scopes';
import { spec } from '../spec';

export let getTeam = SlateTool.create(spec, {
  name: 'Get Team',
  key: 'get_team',
  description: `Retrieve detailed information about a specific Microsoft Team, including its settings, visibility, and member settings.`,
  tags: {
    readOnly: true
  }
})
  .scopes(microsoftTeamsActionScopes.getTeam)
  .input(
    z.object({
      teamId: z.string().describe('ID of the team to retrieve')
    })
  )
  .output(
    z.object({
      teamId: z.string().describe('Unique identifier of the team'),
      displayName: z.string().describe('Display name of the team'),
      description: z.string().nullable().describe('Description of the team'),
      isArchived: z.boolean().optional().describe('Whether the team is archived'),
      visibility: z.string().optional().describe('Visibility of the team (public or private)'),
      webUrl: z.string().optional().describe('URL to open the team in Microsoft Teams'),
      memberSettings: z.any().optional().describe('Settings controlling member capabilities'),
      guestSettings: z.any().optional().describe('Settings controlling guest access'),
      messagingSettings: z.any().optional().describe('Settings for messaging in the team'),
      funSettings: z.any().optional().describe('Settings for fun features like Giphy')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphClient({ token: ctx.auth.token });
    let team = await client.getTeam(ctx.input.teamId);

    return {
      output: {
        teamId: team.id,
        displayName: team.displayName,
        description: team.description,
        isArchived: team.isArchived,
        visibility: team.visibility,
        webUrl: team.webUrl,
        memberSettings: team.memberSettings,
        guestSettings: team.guestSettings,
        messagingSettings: team.messagingSettings,
        funSettings: team.funSettings
      },
      message: `Retrieved team **${team.displayName}**.`
    };
  })
  .build();
