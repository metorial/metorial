import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRunData = SlateTool.create(spec, {
  name: 'Get Run Data',
  key: 'get_run_data',
  description: `Retrieve the extracted data from a completed scraping run. You can either provide a specific run token, or provide a project token to get data from the most recent completed run automatically.`,
  instructions: [
    'If you only have a project token and want the latest data, set useLastReady to true and provide the projectToken.',
    'If you have a specific run token, provide it directly.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      runToken: z.string().optional().describe('Token of the specific run to get data from'),
      projectToken: z
        .string()
        .optional()
        .describe(
          'Token of the project to get the last ready run data from (use with useLastReady)'
        ),
      useLastReady: z
        .boolean()
        .optional()
        .describe(
          'When true, retrieves data from the most recent completed run of the project instead of a specific run'
        )
    })
  )
  .output(
    z.object({
      extractedData: z.any().describe('The structured data extracted by the scraping run')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let extractedData: any;

    if (ctx.input.useLastReady && ctx.input.projectToken) {
      extractedData = await client.getLastReadyRunData(ctx.input.projectToken);
    } else if (ctx.input.runToken) {
      extractedData = await client.getRunData(ctx.input.runToken);
    } else {
      throw new Error('Provide either a runToken or set useLastReady with a projectToken.');
    }

    return {
      output: {
        extractedData
      },
      message: ctx.input.useLastReady
        ? `Retrieved data from the last ready run of project **${ctx.input.projectToken}**.`
        : `Retrieved data from run **${ctx.input.runToken}**.`
    };
  })
  .build();
