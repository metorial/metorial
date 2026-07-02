import { SlateTool } from 'slates';
import { z } from 'zod';
import { createKubeClient } from '../lib/client';
import { spec } from '../spec';

export let manageJob = SlateTool.create(spec, {
  name: 'Manage Job',
  key: 'manage_job',
  description: `Create or inspect Kubernetes Jobs and CronJobs. Jobs run workloads to completion; CronJobs schedule jobs on a cron-based schedule.`,
  instructions: [
    'For CronJobs, provide the schedule in standard cron format (e.g. "*/5 * * * *").',
    'Use action "get" to retrieve the status and completion information of a job.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get']).describe('Action to perform'),
      resourceKind: z.enum(['jobs', 'cronjobs']).default('jobs').describe('Job or CronJob'),
      jobName: z.string().describe('Name of the job'),
      namespace: z.string().optional().describe('Namespace'),
      image: z
        .string()
        .optional()
        .describe('Container image for the job (required for create)'),
      command: z.array(z.string()).optional().describe('Command to run in the container'),
      schedule: z
        .string()
        .optional()
        .describe('Cron schedule (required for CronJob creation, e.g. "0 */6 * * *")'),
      backoffLimit: z
        .number()
        .optional()
        .describe('Number of retries before marking the job as failed'),
      activeDeadlineSeconds: z
        .number()
        .optional()
        .describe('Duration in seconds for the job to be active'),
      manifest: z.any().optional().describe('Full manifest. Overrides other fields.')
    })
  )
  .output(
    z.object({
      jobName: z.string().describe('Name of the job'),
      jobNamespace: z.string().optional().describe('Namespace'),
      jobKind: z.string().describe('Job or CronJob'),
      active: z.number().optional().describe('Number of active pods'),
      succeeded: z.number().optional().describe('Number of succeeded pods'),
      failed: z.number().optional().describe('Number of failed pods'),
      startedAt: z.string().optional().describe('Start time'),
      completedAt: z.string().optional().describe('Completion time'),
      schedule: z.string().optional().describe('Cron schedule (for CronJobs)'),
      lastScheduledAt: z.string().optional().describe('Last schedule time (for CronJobs)'),
      conditions: z
        .array(
          z.object({
            conditionType: z.string(),
            conditionStatus: z.string(),
            reason: z.string().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createKubeClient(ctx.config, ctx.auth);
    let { action, resourceKind, jobName, namespace } = ctx.input;
    let result: any;

    if (action === 'get') {
      result = await client.getResource(resourceKind, jobName, namespace);
    } else if (ctx.input.manifest) {
      result = await client.createResource(resourceKind, ctx.input.manifest, namespace);
    } else {
      if (!ctx.input.image) {
        throw new Error('image is required for job creation');
      }

      if (resourceKind === 'cronjobs') {
        if (!ctx.input.schedule) {
          throw new Error('schedule is required for CronJob creation');
        }
        let body = {
          apiVersion: 'batch/v1',
          kind: 'CronJob',
          metadata: { name: jobName },
          spec: {
            schedule: ctx.input.schedule,
            jobTemplate: {
              spec: {
                backoffLimit: ctx.input.backoffLimit ?? 3,
                activeDeadlineSeconds: ctx.input.activeDeadlineSeconds,
                template: {
                  spec: {
                    containers: [
                      {
                        name: jobName,
                        image: ctx.input.image,
                        command: ctx.input.command
                      }
                    ],
                    restartPolicy: 'OnFailure'
                  }
                }
              }
            }
          }
        };
        result = await client.createResource('cronjobs', body, namespace);
      } else {
        let body = {
          apiVersion: 'batch/v1',
          kind: 'Job',
          metadata: { name: jobName },
          spec: {
            backoffLimit: ctx.input.backoffLimit ?? 3,
            activeDeadlineSeconds: ctx.input.activeDeadlineSeconds,
            template: {
              spec: {
                containers: [
                  {
                    name: jobName,
                    image: ctx.input.image,
                    command: ctx.input.command
                  }
                ],
                restartPolicy: 'Never'
              }
            }
          }
        };
        result = await client.createResource('jobs', body, namespace);
      }
    }

    let conditions = result.status?.conditions?.map((c: any) => ({
      conditionType: c.type,
      conditionStatus: c.status,
      reason: c.reason
    }));

    return {
      output: {
        jobName: result.metadata.name,
        jobNamespace: result.metadata.namespace,
        jobKind: result.kind,
        active: result.status?.active,
        succeeded: result.status?.succeeded,
        failed: result.status?.failed,
        startedAt: result.status?.startTime,
        completedAt: result.status?.completionTime,
        schedule: result.spec?.schedule,
        lastScheduledAt: result.status?.lastScheduleTime,
        conditions
      },
      message: `${action === 'get' ? 'Retrieved' : 'Created'} ${result.kind} **${result.metadata.name}**.${result.status?.succeeded ? ` Succeeded: ${result.status.succeeded}` : ''}`
    };
  })
  .build();
