import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCoaches = SlateTool.create(spec, {
  name: 'Get Coaches',
  key: 'get_coaches',
  description: `Look up college football coaching records including seasons coached, teams, wins, losses, and SP+ metrics. Search by coach name, school, or year.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      firstName: z.string().optional().describe('Coach first name'),
      lastName: z.string().optional().describe('Coach last name'),
      school: z.string().optional().describe('School/team name'),
      year: z.number().optional().describe('Specific season year'),
      minYear: z.number().optional().describe('Minimum year for year range filter'),
      maxYear: z.number().optional().describe('Maximum year for year range filter')
    })
  )
  .output(
    z.object({
      coaches: z.array(z.any()).describe('Array of coach records with season-by-season data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let coaches = await client.getCoaches(ctx.input);

    let count = Array.isArray(coaches) ? coaches.length : 0;
    return {
      output: { coaches },
      message: `Found **${count}** coach record(s).`
    };
  })
  .build();
