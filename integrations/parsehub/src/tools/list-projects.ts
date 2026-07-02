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

let projectSchema = z.object({
  projectToken: z.string().describe('Unique token identifying the project'),
  title: z.string().describe('Name of the project'),
  mainTemplate: z.string().describe('Default template used as the entry point'),
  mainSite: z.string().describe('Default starting URL for the project'),
  lastRun: runSchema.nullable().describe('Most recent run for this project'),
  lastReadyRun: runSchema.nullable().describe('Most recent run with data available'),
  runList: z.array(runSchema).describe('List of recent runs')
});

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all scraping projects in your ParseHub account. Returns project metadata including titles, default URLs, templates, and recent run information. Supports pagination for accounts with many projects.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      offset: z
        .number()
        .optional()
        .describe('Index to start listing projects from (for pagination)'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of projects to return (default 20)'),
      includeOptions: z
        .boolean()
        .optional()
        .describe('Include project options/configuration in the response')
    })
  )
  .output(
    z.object({
      projects: z.array(projectSchema).describe('List of projects'),
      totalProjects: z.number().describe('Total number of projects in the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listProjects({
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      includeOptions: ctx.input.includeOptions
    });

    let projects = result.projects.map(p => ({
      projectToken: p.token,
      title: p.title,
      mainTemplate: p.main_template,
      mainSite: p.main_site,
      lastRun: p.last_run ? mapRun(p.last_run) : null,
      lastReadyRun: p.last_ready_run ? mapRun(p.last_ready_run) : null,
      runList: (p.run_list || []).map(mapRun)
    }));

    return {
      output: {
        projects,
        totalProjects: result.total_projects
      },
      message: `Found **${result.total_projects}** project(s). Returned ${projects.length} project(s)${ctx.input.offset ? ` starting from offset ${ctx.input.offset}` : ''}.`
    };
  })
  .build();

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
