import { SlateTool } from 'slates';
import { z } from 'zod';
import { PointagramClient } from '../lib/client';
import { spec } from '../spec';

export let createTeam = SlateTool.create(spec, {
  name: 'Create Team',
  key: 'create_team',
  description: `Creates a new team in Pointagram. An icon is required and can be one of the built-in icons (e.g. Bears, Bulls, Sharks) or a custom icon previously uploaded through the Pointagram UI.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      teamName: z.string().describe('Name of the team'),
      icon: z
        .string()
        .describe(
          'Team icon name. Use built-in icons like "Bears", "Bulls", "Sharks", "Eagles", "Lions", "Tigers", "Wolves", "Panthers", "Hawks", "Falcons" or a custom-uploaded icon name'
        ),
      filterIgnore: z
        .boolean()
        .optional()
        .describe('If true, this team is exempt from filter settings')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Response from the Pointagram API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PointagramClient({
      token: ctx.auth.token,
      apiUser: ctx.auth.apiUser
    });

    let result = await client.createTeam({
      teamName: ctx.input.teamName,
      icon: ctx.input.icon,
      filterIgnore: ctx.input.filterIgnore
    });

    return {
      output: { result },
      message: `Created team **${ctx.input.teamName}** with icon "${ctx.input.icon}".`
    };
  })
  .build();
