import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let runSchema = z
  .object({
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
  .partial();

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Get detailed information about a specific ParseHub scraping project. Returns project metadata, configuration, and a list of recent runs with their statuses. Use the project token found in the project's settings in the ParseHub client.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectToken: z
        .string()
        .describe('Unique token identifying the project (found in project settings)'),
      offset: z
        .number()
        .optional()
        .describe('Index to start listing runs from within the project'),
      includeOptions: z
        .boolean()
        .optional()
        .describe('Include project options/configuration in the response')
    })
  )
  .output(
    z.object({
      projectToken: z.string().describe('Unique token identifying the project'),
      title: z.string().describe('Name of the project'),
      mainTemplate: z.string().describe('Default template used as the entry point'),
      mainSite: z.string().describe('Default starting URL for the project'),
      optionsJson: z
        .string()
        .optional()
        .describe('Project configuration options as JSON string'),
      templatesJson: z
        .string()
        .optional()
        .describe('Project templates configuration as JSON string'),
      lastRun: runSchema.nullable().describe('Most recent run for this project'),
      lastReadyRun: runSchema.nullable().describe('Most recent run with data available'),
      runList: z.array(runSchema).describe('List of recent runs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let project = await client.getProject(ctx.input.projectToken, {
      offset: ctx.input.offset,
      includeOptions: ctx.input.includeOptions
    });

    let mapRun = (r: any) => ({
      projectToken: r.project_token,
      runToken: r.run_token,
      status: r.status,
      dataReady: r.data_ready,
      startTime: r.start_time,
      endTime: r.end_time,
      pages: r.pages,
      md5sum: r.md5sum,
      startUrl: r.start_url,
      startTemplate: r.start_template,
      startValue: r.start_value
    });

    let output = {
      projectToken: project.token,
      title: project.title,
      mainTemplate: project.main_template,
      mainSite: project.main_site,
      optionsJson: project.options_json || undefined,
      templatesJson: project.templates_json || undefined,
      lastRun: project.last_run ? mapRun(project.last_run) : null,
      lastReadyRun: project.last_ready_run ? mapRun(project.last_ready_run) : null,
      runList: (project.run_list || []).map(mapRun)
    };

    return {
      output,
      message: `Project **${project.title}** has ${output.runList.length} recent run(s). Last run status: ${project.last_run?.status ?? 'none'}.`
    };
  })
  .build();
