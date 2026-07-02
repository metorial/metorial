import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEnvironmentStatus = SlateTool.create(spec, {
  name: 'Get Environment Status',
  key: 'get_environment_status',
  description: `Check the status of the Docmosis Cloud environment including service availability, account plan, page quota usage, and the current render queue status.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      serviceOnline: z.boolean().describe('Whether the Docmosis Cloud service is online'),
      environmentReady: z
        .boolean()
        .describe('Whether the environment is ready to process documents'),
      environmentName: z.string().optional().describe('Name of the environment'),
      planName: z.string().optional().describe('Current subscription plan name'),
      isActivated: z.boolean().optional().describe('Whether the environment is activated'),
      pageQuotaUsed: z
        .number()
        .optional()
        .describe('Number of pages used in the current billing period'),
      pageQuotaLimit: z
        .number()
        .optional()
        .describe('Total page quota for the current billing period'),
      pageQuotaPercentUsed: z.number().optional().describe('Percentage of page quota used'),
      isHardLimited: z
        .boolean()
        .optional()
        .describe('Whether the quota is a hard limit that blocks further rendering'),
      queueAvailablePercent: z
        .number()
        .optional()
        .describe('Percentage of render queue capacity available'),
      queueDelaySeconds: z
        .number()
        .optional()
        .describe('Estimated delay in seconds for queued requests'),
      queueRejected: z
        .boolean()
        .optional()
        .describe('Whether the queue is rejecting new requests')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let [pingOk, summaryResult, queueResult] = await Promise.all([
      client.ping().catch(() => false),
      client.environmentSummary(),
      client.getRenderQueue()
    ]);

    let envDetails = summaryResult.accountEnvironmentSummary;
    let quota = envDetails?.pageQuota;
    let queueInfo = queueResult.queueInfo;

    let message = `Service: **${pingOk ? 'Online' : 'Offline'}** | Environment: **${envDetails?.ready ? 'Ready' : 'Not Ready'}** | Plan: **${envDetails?.plan?.name || 'N/A'}** | Pages used: **${quota?.used ?? 'N/A'}/${quota?.quota ?? 'N/A'}** (${quota?.pctUsedStr || 'N/A'})`;

    return {
      output: {
        serviceOnline: pingOk,
        environmentReady: envDetails?.ready ?? false,
        environmentName: envDetails?.accountEnvDetails?.name,
        planName: envDetails?.plan?.name,
        isActivated: envDetails?.accountEnvDetails?.isActivated,
        pageQuotaUsed: quota?.used,
        pageQuotaLimit: quota?.quota,
        pageQuotaPercentUsed: quota?.pctUsed,
        isHardLimited: quota?.isHardLimited,
        queueAvailablePercent: queueInfo?.availablePct,
        queueDelaySeconds: queueInfo?.delaySeconds,
        queueRejected: queueInfo?.rejected
      },
      message
    };
  })
  .build();
