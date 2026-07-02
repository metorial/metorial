import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let runProject = SlateTool.create(spec, {
  name: 'Run Project',
  key: 'run_project',
  description: `Start a new scraping run for a ParseHub project on the cloud. You can optionally override the starting URL, template, or pass a custom value for parameterized scraping. The run will begin with status "initialized" and progress to "running", then "complete" or "error".`,
  instructions: [
    'Use startValueOverride to pass dynamic parameters to the scraping project (must be a valid JSON string).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectToken: z.string().describe('Unique token identifying the project to run'),
      startUrl: z
        .string()
        .optional()
        .describe('Override the default starting URL for the scraping run'),
      startTemplate: z
        .string()
        .optional()
        .describe('Specify which template to use as the entry point'),
      startValueOverride: z
        .string()
        .optional()
        .describe('JSON value passed to the project for dynamic/parameterized scraping'),
      sendEmail: z
        .boolean()
        .optional()
        .describe('Send a notification email when the run completes')
    })
  )
  .output(
    z.object({
      projectToken: z.string().describe('Token of the project this run belongs to'),
      runToken: z.string().describe('Unique token identifying the newly created run'),
      status: z.string().describe('Initial status of the run (typically "initialized")'),
      dataReady: z.number().describe('Whether extracted data is available (0 = not ready)'),
      startTime: z.string().describe('When the run started'),
      endTime: z.string().describe('When the run ended (empty if still running)'),
      pages: z.number().describe('Number of pages scraped so far'),
      md5sum: z.string().describe('MD5 checksum of the extracted data'),
      startUrl: z.string().describe('URL the run started scraping from'),
      startTemplate: z.string().describe('Template used as the entry point'),
      startValue: z.string().describe('Value passed to the project')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let run = await client.runProject(ctx.input.projectToken, {
      startUrl: ctx.input.startUrl,
      startTemplate: ctx.input.startTemplate,
      startValueOverride: ctx.input.startValueOverride,
      sendEmail: ctx.input.sendEmail
    });

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
      message: `Started run **${run.run_token}** for project. Status: **${run.status}**. Scraping URL: ${run.start_url || 'default'}.`
    };
  })
  .build();
