import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { spec } from '../spec';

export let getIncidentRequestStatus = SlateTool.create(spec, {
  name: 'Get Incident Request Status',
  key: 'get_incident_request_status',
  description:
    'Check the processing status of an asynchronous incident request, such as create, delete, resolve, close, or add note.',
  constraints: ['Requires Standard or Enterprise plan.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      requestId: z
        .string()
        .describe('Request ID returned by an asynchronous incident operation')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Request ID that was checked'),
      success: z.boolean().optional().describe('Whether the request was processed'),
      isSuccess: z.boolean().optional().describe('Whether processing succeeded'),
      action: z.string().optional().describe('Action that was processed'),
      status: z.string().optional().describe('Status message returned by Opsgenie'),
      incidentId: z
        .string()
        .optional()
        .describe('Incident ID produced or affected by the request'),
      processedAt: z.string().optional().describe('When the request was processed'),
      integrationId: z.string().optional().describe('Opsgenie integration ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpsGenieClient({
      token: ctx.auth.token,
      instance: ctx.config.instance
    });

    let response = await client.getIncidentRequestStatus(ctx.input.requestId);
    let data = response.data ?? {};

    return {
      output: {
        requestId: response.requestId ?? ctx.input.requestId,
        success: data.success,
        isSuccess: data.isSuccess,
        action: data.action,
        status: data.status,
        incidentId: data.incidentId || undefined,
        processedAt: data.processedAt,
        integrationId: data.integrationId
      },
      message: `Incident request \`${ctx.input.requestId}\` status: ${data.status ?? 'unknown'}`
    };
  })
  .build();
