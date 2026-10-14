import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRunData = SlateTool.create(spec, {
  name: 'Get Run Data',
  key: 'get_run_data',
  description: `Retrieve the extracted JSON data and a downloadable JSON file from a ready scraping run. Provide a run token, or set useLastReady with a project token to use the most recent run with available data.`,
  instructions: [
    'If you only have a project token and want the latest data, set useLastReady to true and provide the projectToken. Call list_projects to discover project tokens.',
    'If you have a specific run token, provide it directly. Use export_run_data for a CSV download.'
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
        .describe('Project token from list_projects to use with useLastReady'),
      useLastReady: z
        .boolean()
        .optional()
        .describe('When true, use the most recent run with available data for projectToken')
    })
  )
  .output(
    z.object({
      extractedData: z.any().describe('The structured data extracted by the scraping run')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.useLastReady && !ctx.input.projectToken?.trim()) {
      throw createApiServiceError('Provide projectToken when useLastReady is true.');
    }
    if (!ctx.input.useLastReady && !ctx.input.runToken?.trim()) {
      throw createApiServiceError('Provide runToken, or set useLastReady with projectToken.');
    }

    let client = new Client({ token: ctx.auth.token });
    let runToken = ctx.input.runToken;
    if (ctx.input.useLastReady && ctx.input.projectToken) {
      let project = await client.getProject(ctx.input.projectToken);
      if (!project.last_ready_run?.run_token) {
        throw createApiServiceError('This project has no run with available data yet.');
      }
      runToken = project.last_ready_run.run_token;
    }
    if (!runToken) {
      throw createApiServiceError('A run token is required to retrieve data.');
    }

    let extractedData = await client.getRunData(runToken);
    await ctx.addAttachment({
      type: 'url',
      url: `https://www.parsehub.com/api/v2/runs/${encodeURIComponent(runToken)}/data`,
      query: { api_key: ctx.auth.token, format: 'json' },
      mimeType: 'application/json'
    });

    return {
      output: { extractedData },
      message: ctx.input.useLastReady
        ? `Retrieved data from the last ready run **${runToken}** of project **${ctx.input.projectToken}**.`
        : `Retrieved data from run **${runToken}**.`
    };
  })
  .build();
