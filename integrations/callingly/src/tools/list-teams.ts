import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `List all teams in the account with their configuration settings including call mode, whisper text, retry settings, and recording preferences.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      teams: z
        .array(
          z.object({
            teamId: z.string().describe('ID of the team'),
            name: z.string().optional().describe('Team name'),
            callMode: z.string().optional().describe('Call mode (e.g., simultaneous)'),
            isRecord: z.boolean().optional().describe('Whether call recording is enabled'),
            language: z.string().optional().describe('Team language setting'),
            delay: z.number().optional().describe('Call delay in seconds')
          })
        )
        .describe('List of teams')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let result = await client.listTeams();
    let teamsArray = Array.isArray(result) ? result : (result.teams ?? result.data ?? []);

    let teams = teamsArray.map((team: any) => ({
      teamId: String(team.id),
      name: team.name,
      callMode: team.call_mode,
      isRecord: team.is_record,
      language: team.language,
      delay: team.delay
    }));

    return {
      output: { teams },
      message: `Found **${teams.length}** team(s).`
    };
  })
  .build();
