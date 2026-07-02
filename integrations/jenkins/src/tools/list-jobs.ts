import { SlateTool } from 'slates';
import { z } from 'zod';
import { JenkinsClient } from '../lib/client';
import { spec } from '../spec';

export let listJobs = SlateTool.create(spec, {
  name: 'List Jobs',
  key: 'list_jobs',
  description: `List jobs available on the Jenkins server. Supports filtering by name and listing jobs within a specific folder. Returns job names, URLs, status colors, and whether each job is buildable.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      folderPath: z
        .string()
        .optional()
        .describe(
          'Path to a folder to list jobs in (e.g. "my-folder" or "parent/child"). Omit to list top-level jobs.'
        ),
      nameFilter: z
        .string()
        .optional()
        .describe('Filter jobs by name (case-insensitive substring match)')
    })
  )
  .output(
    z.object({
      jobs: z.array(
        z.object({
          jobName: z.string().describe('Name of the job'),
          jobUrl: z.string().describe('URL of the job'),
          color: z
            .string()
            .optional()
            .describe(
              'Status color indicator (blue=success, red=failure, notbuilt, disabled, aborted, yellow=unstable)'
            ),
          description: z.string().optional().nullable().describe('Job description'),
          fullName: z
            .string()
            .optional()
            .describe('Fully qualified name including folder path'),
          buildable: z.boolean().optional().describe('Whether the job can be built')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new JenkinsClient({
      instanceUrl: ctx.config.instanceUrl,
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let jobs = await client.listJobs({
      folderPath: ctx.input.folderPath,
      nameFilter: ctx.input.nameFilter
    });

    let mappedJobs = jobs.map((j: any) => ({
      jobName: j.name,
      jobUrl: j.url,
      color: j.color,
      description: j.description,
      fullName: j.fullName,
      buildable: j.buildable
    }));

    return {
      output: { jobs: mappedJobs },
      message: `Found **${mappedJobs.length}** job(s)${ctx.input.folderPath ? ` in folder \`${ctx.input.folderPath}\`` : ''}${ctx.input.nameFilter ? ` matching "${ctx.input.nameFilter}"` : ''}.`
    };
  })
  .build();
