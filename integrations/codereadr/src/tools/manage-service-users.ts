import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageServiceUsers = SlateTool.create(spec, {
  name: 'Manage Service Users',
  key: 'manage_service_users',
  description: `Authorize or revoke app user access to a scanning service. Controls which users can use a specific service on the mobile app.`
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service'),
      userId: z
        .string()
        .describe(
          'ID of the user. Use comma-separated IDs for multiple, or "all" for all users.'
        ),
      operation: z
        .enum(['authorize', 'revoke'])
        .describe('Whether to authorize or revoke user access')
    })
  )
  .output(
    z.object({
      serviceId: z.string().describe('ID of the affected service'),
      userId: z.string().describe('ID of the affected user(s)'),
      operation: z.string().describe('Operation performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (ctx.input.operation === 'authorize') {
      await client.addUserPermission(ctx.input.serviceId, ctx.input.userId);
    } else {
      await client.revokeUserPermission(ctx.input.serviceId, ctx.input.userId);
    }

    return {
      output: {
        serviceId: ctx.input.serviceId,
        userId: ctx.input.userId,
        operation: ctx.input.operation
      },
      message: `${ctx.input.operation === 'authorize' ? 'Authorized' : 'Revoked'} user **${ctx.input.userId}** ${ctx.input.operation === 'authorize' ? 'for' : 'from'} service **${ctx.input.serviceId}**.`
    };
  })
  .build();
