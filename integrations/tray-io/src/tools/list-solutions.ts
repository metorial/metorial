import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrayGraphqlClient } from '../lib/client';
import { spec } from '../spec';

export let listSolutions = SlateTool.create(spec, {
  name: 'List Solutions',
  key: 'list_solutions',
  description: `List all available solutions in the Tray.io workspace. Solutions are configurable project templates that end users can instantiate. Requires a master token.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      solutions: z.array(
        z.object({
          solutionId: z.string().describe('Unique solution ID'),
          title: z.string().describe('Solution title'),
          description: z.string().describe('Solution description'),
          tags: z.array(z.string()).describe('Solution tags')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrayGraphqlClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let solutions = await client.listSolutions();

    return {
      output: { solutions },
      message: `Found **${solutions.length}** solution(s).`
    };
  })
  .build();
