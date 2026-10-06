import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientConfig, TrayGraphqlClient } from '../lib/client';
import { pageInput, pageOutput } from '../lib/validation';
import { spec } from '../spec';

export let listSolutions = SlateTool.create(spec, {
  name: 'List Solutions',
  key: 'list_solutions',
  description: `List one page of available solutions in the Tray.io workspace. Solutions are configurable project templates that end users can instantiate. Requires a master token.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object(pageInput))
  .output(
    z.object({
      ...pageOutput,
      solutions: z.array(
        z.object({
          solutionId: z.string().describe('Unique solution ID'),
          title: z.string().describe('Solution title'),
          description: z
            .string()
            .optional()
            .describe('Native solution description when available'),
          tags: z.array(z.string()).describe('Solution tags'),
          configSlots: z
            .array(
              z.object({
                externalId: z.string(),
                title: z.string(),
                defaultValue: z.unknown().optional()
              })
            )
            .optional()
            .describe('Native configuration slots used when creating an instance')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrayGraphqlClient(clientConfig(ctx));

    let solutions = await client.listSolutions(ctx.input);

    return {
      output: { solutions: solutions.items, pageInfo: solutions.pageInfo },
      message: `Found **${solutions.items.length}** solution(s).`
    };
  })
  .build();
