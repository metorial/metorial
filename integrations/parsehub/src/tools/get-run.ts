import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRun = SlateTool.create(spec, {
  name: 'Get Run',
  key: 'get_run',
  description: `Get the current status and details of a specific scraping run. Use this to check whether a run is still in progress, has completed, or encountered an error.`,
  constraints: ['Rate limited to 25 calls in 5 minutes, then 1 call every 3 minutes per run.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      runToken: z.string().describe('Unique token identifying the run to check')
    })
  )
  .output(
    z.object({
      projectToken: z.string().describe('Token of the project this run belongs to'),
      runToken: z.string().describe('Unique token identifying this run'),
      status: z
        .string()
        .describe('Current status: initialized, running, cancelled, complete, or error'),
      dataReady: z
        .number()
        .describe('Whether extracted data is available (1 = ready, 0 = not ready)'),
      startTime: z.string().describe('When the run started'),
      endTime: z.string().describe('When the run ended'),
      pages: z.number().describe('Number of pages scraped'),
      md5sum: z.string().describe('MD5 checksum of the extracted data'),
      startUrl: z.string().describe('URL the run started scraping from'),
      startTemplate: z.string().describe('Template used as the entry point'),
      startValue: z.string().describe('Value passed to the project for parameterized scraping')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let run = await client.getRun(ctx.input.runToken);

    return {
      output: {
        projectToken: run.project_token,
        runToken: run.run_token,
        status: run.status,
        dataReady: run.data_ready,
        startTime: run.start_time,
        endTime: run.end_time,
        pages: run.pages,
        md5sum: run.md5sum,
        startUrl: run.start_url,
        startTemplate: run.start_template,
        startValue: run.start_value
      },
      message: `Run **${run.run_token}** is **${run.status}**. Pages scraped: ${run.pages}. Data ready: ${run.data_ready ? 'yes' : 'no'}.`
    };
  })
  .build();
