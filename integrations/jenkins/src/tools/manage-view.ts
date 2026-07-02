import { SlateTool } from 'slates';
import { z } from 'zod';
import { JenkinsClient } from '../lib/client';
import { spec } from '../spec';

export let manageView = SlateTool.create(spec, {
  name: 'Manage View',
  key: 'manage_view',
  description: `Create, delete, or update Jenkins views and manage which jobs are displayed in them.
Use **list** to list all views, **get** to get details of a specific view, **create** to create a new view,
**delete** to remove a view, **add_job** to add a job to a view, or **remove_job** to remove a job from a view.`,
  instructions: [
    'For create, provide an XML config. A minimal ListView config: <hudson.model.ListView><name>ViewName</name><filterExecutors>false</filterExecutors><filterQueue>false</filterQueue><properties class="hudson.model.View$PropertyList"/><jobNames><comparator class="hudson.util.CaseInsensitiveComparator"/></jobNames><jobFilters/><columns><hudson.views.StatusColumn/><hudson.views.WeatherColumn/><hudson.views.JobColumn/></columns></hudson.model.ListView>'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'delete', 'add_job', 'remove_job'])
        .describe('Action to perform'),
      viewName: z
        .string()
        .optional()
        .describe('Name of the view. Required for all actions except "list".'),
      xmlConfig: z
        .string()
        .optional()
        .describe('XML configuration for the view. Required for "create".'),
      jobName: z
        .string()
        .optional()
        .describe('Name of the job. Required for "add_job" and "remove_job".')
    })
  )
  .output(
    z.object({
      views: z
        .array(
          z.object({
            viewName: z.string().describe('Name of the view'),
            viewUrl: z.string().optional().describe('URL of the view'),
            description: z.string().optional().nullable().describe('View description')
          })
        )
        .optional()
        .describe('List of views (for "list" action)'),
      viewName: z.string().optional().describe('Name of the affected view'),
      jobs: z
        .array(
          z.object({
            jobName: z.string().describe('Job name'),
            jobUrl: z.string().describe('Job URL'),
            color: z.string().optional().describe('Status color')
          })
        )
        .optional()
        .describe('Jobs in the view (for "get" action)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JenkinsClient({
      instanceUrl: ctx.config.instanceUrl,
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let { action, viewName, xmlConfig, jobName } = ctx.input;

    if (action === 'list') {
      let views = await client.listViews();
      let mapped = views.map((v: any) => ({
        viewName: v.name,
        viewUrl: v.url,
        description: v.description
      }));
      return {
        output: { views: mapped, success: true },
        message: `Found **${mapped.length}** view(s).`
      };
    }

    if (!viewName) throw new Error('viewName is required for this action');

    if (action === 'get') {
      let view = await client.getView(viewName);
      let jobs = (view.jobs || []).map((j: any) => ({
        jobName: j.name,
        jobUrl: j.url,
        color: j.color
      }));
      return {
        output: { viewName, jobs, success: true },
        message: `View **${viewName}** has **${jobs.length}** job(s).`
      };
    }

    if (action === 'create') {
      if (!xmlConfig) throw new Error('xmlConfig is required for create action');
      await client.createView(viewName, xmlConfig);
      return {
        output: { viewName, success: true },
        message: `View **${viewName}** created.`
      };
    }

    if (action === 'delete') {
      await client.deleteView(viewName);
      return {
        output: { viewName, success: true },
        message: `View **${viewName}** deleted.`
      };
    }

    if (action === 'add_job') {
      if (!jobName) throw new Error('jobName is required for add_job action');
      await client.addJobToView(viewName, jobName);
      return {
        output: { viewName, success: true },
        message: `Job \`${jobName}\` added to view **${viewName}**.`
      };
    }

    if (action === 'remove_job') {
      if (!jobName) throw new Error('jobName is required for remove_job action');
      await client.removeJobFromView(viewName, jobName);
      return {
        output: { viewName, success: true },
        message: `Job \`${jobName}\` removed from view **${viewName}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
