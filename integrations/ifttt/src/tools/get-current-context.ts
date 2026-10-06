import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnectClient } from '../lib/client';
import { spec } from '../spec';

export const getCurrentContextTool = SlateTool.create(spec, {
  name: 'Get Current Context',
  key: 'get_current_context',
  description:
    'Read the authenticated Platform service and optionally the IFTTT login connected to an exact user ID from your service. This does not identify the owner of a Maker Webhooks key.',
  instructions: [
    'Requires a Platform Service Key. User IDs come from your service; no account-wide user or connection discovery is provided.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe(
          'Optional exact user ID from your own service, not an IFTTT numeric account ID'
        )
    })
  )
  .output(
    z.object({
      serviceId: z.string().describe('Authenticated native service ID'),
      authenticationLevel: z.string().describe('Native authentication level'),
      requestedUserId: z
        .string()
        .optional()
        .describe('User ID supplied in this request; not independently discovered'),
      userLogin: z
        .string()
        .nullable()
        .optional()
        .describe('Native connected IFTTT login, when available')
    })
  )
  .handleInvocation(async ctx => {
    const info = await new ConnectClient(ctx.auth).getServiceInfo(ctx.input.userId);
    return {
      output: {
        serviceId: info.service_id,
        authenticationLevel: info.authentication_level,
        requestedUserId: ctx.input.userId,
        userLogin: info.user_login
      },
      message: `Retrieved the current IFTTT service context${ctx.input.userId === undefined ? '' : ' for the requested user'}.`
    };
  })
  .build();
