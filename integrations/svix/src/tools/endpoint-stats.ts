import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEndpointStats = SlateTool.create(spec, {
  name: 'Get Endpoint Stats',
  key: 'get_endpoint_stats',
  description: `Get delivery statistics for a specific endpoint including counts of successful, pending, failed, and sending attempts. Also retrieves the endpoint's signing secret for webhook verification.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      applicationId: z.string().describe('Application ID or UID'),
      endpointId: z.string().describe('Endpoint ID or UID'),
      since: z
        .string()
        .optional()
        .describe('Filter stats to deliveries after this ISO timestamp'),
      until: z
        .string()
        .optional()
        .describe('Filter stats to deliveries before this ISO timestamp'),
      includeSecret: z
        .boolean()
        .optional()
        .describe('Whether to include the endpoint signing secret in the response')
    })
  )
  .output(
    z.object({
      success: z.number().describe('Number of successful deliveries'),
      pending: z.number().describe('Number of pending deliveries'),
      fail: z.number().describe('Number of failed deliveries'),
      sending: z.number().describe('Number of deliveries in progress'),
      canceled: z.number().describe('Number of canceled deliveries'),
      signingSecret: z
        .string()
        .optional()
        .describe('Endpoint signing secret (only if includeSecret was true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    ctx.progress('Fetching endpoint stats...');
    let stats = await client.getEndpointStats(ctx.input.applicationId, ctx.input.endpointId, {
      since: ctx.input.since,
      until: ctx.input.until
    });

    let signingSecret: string | undefined;
    if (ctx.input.includeSecret) {
      ctx.progress('Fetching signing secret...');
      let secret = await client.getEndpointSecret(
        ctx.input.applicationId,
        ctx.input.endpointId
      );
      signingSecret = secret.key;
    }

    return {
      output: {
        success: stats.success,
        pending: stats.pending,
        fail: stats.fail,
        sending: stats.sending,
        canceled: stats.canceled,
        signingSecret
      },
      message: `Endpoint \`${ctx.input.endpointId}\` stats: **${stats.success}** success, **${stats.pending}** pending, **${stats.fail}** failed, **${stats.sending}** sending, **${stats.canceled}** canceled.`
    };
  })
  .build();
