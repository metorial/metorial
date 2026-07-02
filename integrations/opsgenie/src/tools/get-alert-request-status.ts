import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { spec } from '../spec';

export let getAlertRequestStatus = SlateTool.create(spec, {
  name: 'Get Alert Request Status',
  key: 'get_alert_request_status',
  description:
    'Check the processing status of an asynchronous alert request, such as create, delete, acknowledge, close, snooze, assign, or tag updates.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      requestId: z.string().describe('Request ID returned by an asynchronous alert operation')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Request ID that was checked'),
      success: z.boolean().optional().describe('Whether the request was processed'),
      isSuccess: z.boolean().optional().describe('Whether processing succeeded'),
      action: z.string().optional().describe('Action that was processed'),
      status: z.string().optional().describe('Status message returned by Opsgenie'),
      alertId: z.string().optional().describe('Alert ID produced or affected by the request'),
      alias: z.string().optional().describe('Alert alias produced or affected by the request'),
      processedAt: z.string().optional().describe('When the request was processed'),
      integrationId: z.string().optional().describe('Opsgenie integration ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpsGenieClient({
      token: ctx.auth.token,
      instance: ctx.config.instance
    });

    let response = await client.getAlertRequestStatus(ctx.input.requestId);
    let data = response.data ?? {};

    return {
      output: {
        requestId: response.requestId ?? ctx.input.requestId,
        success: data.success,
        isSuccess: data.isSuccess,
        action: data.action,
        status: data.status,
        alertId: data.alertId || undefined,
        alias: data.alias || undefined,
        processedAt: data.processedAt,
        integrationId: data.integrationId
      },
      message: `Alert request \`${ctx.input.requestId}\` status: ${data.status ?? 'unknown'}`
    };
  })
  .build();
