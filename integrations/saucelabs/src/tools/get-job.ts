import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getJob = SlateTool.create(spec, {
  name: 'Get Job Details',
  key: 'get_job',
  description: `Retrieve full details about a specific test job, including status, environment configuration, duration, error messages, and asset information. Works with both VDC and RDC jobs.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      jobId: z.string().describe('The unique ID of the test job'),
      source: z
        .enum(['vdc', 'rdc'])
        .default('vdc')
        .describe('Device source: vdc (virtual devices) or rdc (real devices)')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Unique job identifier'),
      owner: z.string().optional().describe('Username of job owner'),
      status: z.string().optional().describe('Job status'),
      passed: z.boolean().nullable().optional().describe('Whether the job passed'),
      name: z.string().nullable().optional().describe('Test name'),
      build: z.string().nullable().optional().describe('Build name'),
      browser: z.string().optional().describe('Browser name (VDC)'),
      browserVersion: z.string().optional().describe('Browser version (VDC)'),
      os: z.string().optional().describe('Operating system'),
      osVersion: z.string().optional().describe('OS version (RDC)'),
      deviceName: z.string().optional().describe('Device name (RDC)'),
      automationBackend: z.string().optional().describe('Automation framework'),
      creationTime: z.number().optional().describe('Creation time (Unix timestamp)'),
      startTime: z.number().optional().describe('Start time (Unix timestamp)'),
      endTime: z.number().optional().describe('End time (Unix timestamp)'),
      duration: z.number().optional().describe('Duration in seconds'),
      tags: z.array(z.string()).optional().describe('Job tags'),
      error: z.string().nullable().optional().describe('Error message'),
      videoUrl: z.string().optional().describe('URL to the video recording'),
      logUrl: z.string().optional().describe('URL to the log file'),
      customData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom metadata attached to the job')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.source === 'rdc') {
      let j = await client.getRdcJob(ctx.input.jobId);
      return {
        output: {
          jobId: j.id,
          owner: j.owner_sauce ?? j.owner ?? undefined,
          status: j.consolidated_status ?? j.status ?? undefined,
          passed: j.passed,
          name: j.name,
          build: j.build,
          os: j.os ?? undefined,
          osVersion: j.os_version ?? undefined,
          deviceName: j.device_name ?? undefined,
          automationBackend: j.automation_backend ?? undefined,
          creationTime: j.creation_time == null ? undefined : j.creation_time / 1000,
          startTime: j.start_time == null ? undefined : j.start_time / 1000,
          endTime: j.end_time == null ? undefined : j.end_time / 1000,
          duration:
            j.end_time != null && j.start_time != null
              ? (j.end_time - j.start_time) / 1000
              : undefined,
          tags: j.tags ?? undefined,
          error: j.error
        },
        message: `Job **${j.name ?? j.id}** on ${j.device_name ?? 'real device'} — status: **${j.consolidated_status ?? j.status}**`
      };
    }

    let j = await client.getJob(ctx.input.jobId);
    return {
      output: {
        jobId: j.id,
        owner: j.owner ?? undefined,
        status: j.consolidated_status ?? j.status,
        passed: j.passed,
        name: j.name,
        build: j.build,
        browser: j.browser ?? undefined,
        browserVersion: j.browser_version ?? undefined,
        os: j.os ?? undefined,
        automationBackend: j.automation_backend ?? undefined,
        creationTime: j.creation_time ?? undefined,
        startTime: j.start_time ?? undefined,
        endTime: j.end_time ?? undefined,
        duration: j.duration ?? undefined,
        tags: j.tags ?? undefined,
        error: j.error,
        videoUrl: j.video_url ?? undefined,
        logUrl: j.log_url ?? undefined,
        customData: j['custom-data'] ?? undefined
      },
      message: `Job **${j.name ?? j.id}** on ${j.browser ?? 'unknown browser'} ${j.browser_version ?? ''} / ${j.os ?? ''} — status: **${j.consolidated_status ?? j.status}**`
    };
  })
  .build();
