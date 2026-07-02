import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let buildEvents = SlateTrigger.create(spec, {
  name: 'Build Events',
  key: 'build_events',
  description:
    'Triggers on AppVeyor build events including build success, failure, and status changes. Configure a webhook notification in your AppVeyor project settings pointing to the provided webhook URL.'
})
  .input(
    z.object({
      eventName: z.string().describe('Build event name (e.g. build_success, build_failure)'),
      buildId: z.string().describe('Build identifier'),
      projectName: z.string().describe('Project name'),
      buildVersion: z.string().describe('Build version'),
      buildStatus: z.string().describe('Build status'),
      branch: z.string().optional().describe('Branch name'),
      commitId: z.string().optional().describe('Commit SHA'),
      commitAuthor: z.string().optional().describe('Commit author name'),
      commitMessage: z.string().optional().describe('Commit message'),
      pullRequestId: z.string().optional().describe('Pull request ID if applicable'),
      buildUrl: z.string().optional().describe('URL to the build in AppVeyor'),
      payload: z.record(z.string(), z.unknown()).describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      projectName: z.string().describe('Project name'),
      buildVersion: z.string().describe('Build version string'),
      buildNumber: z.string().optional().describe('Build number'),
      buildStatus: z.string().describe('Build status (success, failed, etc.)'),
      branch: z.string().optional().describe('Branch name'),
      commitId: z.string().optional().describe('Commit SHA'),
      commitAuthor: z.string().optional().describe('Commit author name'),
      commitMessage: z.string().optional().describe('Commit message'),
      commitDate: z.string().optional().describe('Commit date'),
      pullRequestId: z.string().optional().describe('Pull request ID if applicable'),
      pullRequestTitle: z.string().optional().describe('Pull request title if applicable'),
      buildUrl: z.string().optional().describe('URL to the build in AppVeyor'),
      buildDuration: z.string().optional().describe('Build duration'),
      buildStarted: z.string().optional().describe('Build start timestamp'),
      buildFinished: z.string().optional().describe('Build finish timestamp'),
      projectId: z.string().optional().describe('Project ID'),
      accountName: z.string().optional().describe('Account name'),
      jobs: z.array(z.record(z.string(), z.unknown())).optional().describe('Build jobs')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!data) {
        return { inputs: [] };
      }

      let eventName = data.eventName || 'build_completed';
      let eventData = data.eventData || data;

      let buildId = String(eventData.buildId || eventData.buildNumber || '');
      let projectName = eventData.projectName || eventData.projectId || '';
      let buildVersion = eventData.buildVersion || '';
      let buildStatus = eventData.buildStatus || eventData.status || '';
      let branch = eventData.branch || eventData.branchName || '';
      let commitId = eventData.commitId || '';
      let commitAuthor = eventData.commitAuthor || eventData.commitAuthorName || '';
      let commitMessage = eventData.commitMessage || eventData.commitMessageExtended || '';
      let pullRequestId = eventData.pullRequestId
        ? String(eventData.pullRequestId)
        : undefined;
      let buildUrl = eventData.buildUrl || '';

      return {
        inputs: [
          {
            eventName,
            buildId,
            projectName,
            buildVersion,
            buildStatus,
            branch: branch || undefined,
            commitId: commitId || undefined,
            commitAuthor: commitAuthor || undefined,
            commitMessage: commitMessage || undefined,
            pullRequestId,
            buildUrl: buildUrl || undefined,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.payload as any;
      let eventData = p.eventData || p;

      let eventName = ctx.input.eventName;
      let eventType = 'build.completed';
      if (eventName.includes('success') || ctx.input.buildStatus === 'success') {
        eventType = 'build.success';
      } else if (eventName.includes('fail') || ctx.input.buildStatus === 'failed') {
        eventType = 'build.failure';
      } else if (eventName.includes('status_changed')) {
        eventType = 'build.status_changed';
      }

      return {
        type: eventType,
        id: `${ctx.input.projectName}-${ctx.input.buildVersion}-${ctx.input.buildId}`,
        output: {
          projectName: ctx.input.projectName,
          buildVersion: ctx.input.buildVersion,
          buildNumber: eventData.buildNumber ? String(eventData.buildNumber) : undefined,
          buildStatus: ctx.input.buildStatus,
          branch: ctx.input.branch,
          commitId: ctx.input.commitId,
          commitAuthor: ctx.input.commitAuthor,
          commitMessage: ctx.input.commitMessage,
          commitDate: eventData.commitDate || eventData.committedDate,
          pullRequestId: ctx.input.pullRequestId,
          pullRequestTitle: eventData.pullRequestTitle,
          buildUrl: ctx.input.buildUrl,
          buildDuration: eventData.duration ? String(eventData.duration) : undefined,
          buildStarted: eventData.started || eventData.buildStarted,
          buildFinished: eventData.finished || eventData.buildFinished,
          projectId: eventData.projectId ? String(eventData.projectId) : undefined,
          accountName: eventData.accountName,
          jobs: Array.isArray(eventData.jobs) ? eventData.jobs : undefined
        }
      };
    }
  })
  .build();
