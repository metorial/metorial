import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, flattenResource, type JsonApiResource } from '../lib/client';
import { spec } from '../spec';

export let manageAlert = SlateTool.create(spec, {
  name: 'Manage Alert',
  key: 'manage_alert',
  description: `Acknowledge or resolve an alert. Open alerts cannot be acknowledged; inspect a triggered alert before acknowledgement. Resolving an alert does not resolve its related incidents.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      alertId: z.string().describe('Alert ID to manage'),
      action: z.enum(['acknowledge', 'resolve']).describe('Action to perform on the alert')
    })
  )
  .output(
    z.object({
      alert: z.record(z.string(), z.any()).describe('Updated alert details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    const result =
      ctx.input.action === 'acknowledge'
        ? await client.acknowledgeAlert(ctx.input.alertId)
        : await client.resolveAlert(ctx.input.alertId);

    let alert = flattenResource(result.data as JsonApiResource);

    return {
      output: {
        alert
      },
      message: `Alert ${ctx.input.alertId} has been **${ctx.input.action}d**.`
    };
  })
  .build();
