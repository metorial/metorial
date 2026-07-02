import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let testJobEvents = SlateTrigger.create(spec, {
  name: 'Test Job Events',
  key: 'test_job_events',
  description:
    'Receive webhook notifications when test jobs complete on Sauce Labs. Covers both Virtual Device Cloud (VDC) and Real Device Cloud (RDC) test jobs. Configure in Sauce Labs under Account > Webhooks.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of test event'),
      jobId: z.string().describe('Job ID'),
      payload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Test job identifier'),
      jobName: z.string().optional().describe('Test name'),
      owner: z.string().optional().describe('Account username that ran the test'),
      ownerId: z.string().optional().describe('Account user UUID'),
      orgId: z.string().optional().describe('Organization UUID'),
      teamId: z.string().optional().describe('Team UUID'),
      teamName: z.string().optional().describe('Team name'),
      status: z.string().optional().describe('Job status (COMPLETE, PASSED, FAILED, ERRORED)'),
      passed: z.boolean().optional().describe('Whether the test passed'),
      browserName: z.string().optional().describe('Browser name (VDC)'),
      browserVersion: z.string().optional().describe('Browser version (VDC)'),
      osName: z.string().optional().describe('Operating system'),
      osVersion: z.string().optional().describe('OS version'),
      deviceName: z.string().optional().describe('Device name (RDC)'),
      automationBackend: z
        .string()
        .optional()
        .describe('Automation framework (webdriver, cypress, appium, etc.)'),
      buildName: z.string().optional().describe('Build name'),
      tags: z.array(z.string()).optional().describe('Job tags'),
      visibility: z.string().optional().describe('Visibility level'),
      app: z.string().optional().describe('App identifier (RDC)'),
      creationTime: z.number().optional().describe('Job creation time (Unix timestamp)'),
      modificationTime: z
        .number()
        .optional()
        .describe('Last modification time (Unix timestamp)'),
      durationSeconds: z.number().optional().describe('Job duration in seconds'),
      error: z.string().optional().describe('Error message if any'),
      exception: z.string().optional().describe('Exception details if any'),
      commitId: z.string().optional().describe('Git commit ID'),
      branchName: z.string().optional().describe('Git branch name'),
      dataType: z.string().optional().describe('Source identifier (vdc or rdc)')
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

      if (!data?.id) {
        return { inputs: [] };
      }

      let statusLower = (data.status ?? '').toLowerCase();
      let eventType =
        data.passed === true
          ? 'job.passed'
          : data.passed === false
            ? 'job.failed'
            : `job.${statusLower || 'completed'}`;

      return {
        inputs: [
          {
            eventType,
            jobId: data.id,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.payload;

      return {
        type: ctx.input.eventType,
        id: ctx.input.jobId,
        output: {
          jobId: p.id,
          jobName: p.name,
          owner: p.owner,
          ownerId: p.owner_id,
          orgId: p.org_id,
          teamId: p.team_id,
          teamName: p.team_name,
          status: p.status,
          passed: p.passed,
          browserName: p.browser_name,
          browserVersion: p.browser_version,
          osName: p.os_name,
          osVersion: p.os_version,
          deviceName: p.device,
          automationBackend: p.automation_backend,
          buildName: p.build,
          tags: p.tags,
          visibility: p.visibility,
          app: p.app,
          creationTime: p.creation_time,
          modificationTime: p.modification_time,
          durationSeconds: p.duration_sec,
          error: p.error || undefined,
          exception: p.exception || undefined,
          commitId: p.commit_id || undefined,
          branchName: p.branch_name || undefined,
          dataType: p.data_type
        }
      };
    }
  })
  .build();
