import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWorkingPatterns = SlateTool.create(spec, {
  name: 'List Working Patterns',
  key: 'list_working_patterns',
  description: `Retrieve working pattern configurations from Breathe HR. Returns patterns with details such as name, total hours, and default status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      workingPatterns: z
        .array(z.record(z.string(), z.any()))
        .describe('List of working pattern records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.listWorkingPatterns({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let workingPatterns = result?.working_patterns || [];

    return {
      output: { workingPatterns },
      message: `Retrieved **${workingPatterns.length}** working pattern(s).`
    };
  })
  .build();
