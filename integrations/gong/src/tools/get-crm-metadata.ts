import { SlateTool } from 'slates';
import { z } from 'zod';
import { GongClient } from '../lib/client';
import { gongServiceError } from '../lib/errors';
import { spec } from '../spec';

export let getCrmMetadata = SlateTool.create(spec, {
  name: 'Get CRM Metadata',
  key: 'get_crm_metadata',
  description: `Read Gong CRM API metadata: registered integrations, selected entity schema fields, or asynchronous CRM upload/delete request status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list_integrations', 'list_entity_schema', 'get_request_status'])
        .describe('CRM metadata action to run'),
      integrationId: z
        .string()
        .optional()
        .describe('CRM integration ID required for schema and request status actions'),
      objectType: z
        .enum(['ACCOUNT', 'CONTACT', 'DEAL', 'LEAD'])
        .optional()
        .describe('CRM object type required for list_entity_schema'),
      clientRequestId: z
        .string()
        .optional()
        .describe('Client request ID required for get_request_status')
    })
  )
  .output(
    z.object({
      integrations: z.array(z.any()).optional().describe('Registered CRM integrations'),
      objectTypeToSelectedFields: z
        .record(z.string(), z.array(z.any()))
        .optional()
        .describe('Selected schema fields by object type'),
      status: z.string().optional().describe('Asynchronous request status'),
      errors: z.array(z.any()).optional().describe('Request processing errors'),
      totalErrorCount: z.number().optional().describe('Total failed objects'),
      totalSuccessCount: z.number().optional().describe('Total successful objects'),
      requestId: z.string().optional().describe('Gong request ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GongClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl
    });

    if (ctx.input.action === 'list_integrations') {
      let result = await client.getCrmIntegrations();

      return {
        output: {
          integrations: result.integrations || [],
          requestId: result.requestId
        },
        message: `Retrieved ${result.integrations?.length || 0} Gong CRM integration(s).`
      };
    }

    if (ctx.input.action === 'list_entity_schema') {
      if (!ctx.input.integrationId || !ctx.input.objectType) {
        throw gongServiceError(
          'integrationId and objectType are required for list_entity_schema.'
        );
      }

      let result = await client.getCrmEntitySchema({
        integrationId: ctx.input.integrationId,
        objectType: ctx.input.objectType
      });

      return {
        output: {
          objectTypeToSelectedFields: result.objectTypeToSelectedFields,
          requestId: result.requestId
        },
        message: `Retrieved Gong CRM schema for ${ctx.input.objectType}.`
      };
    }

    if (!ctx.input.integrationId || !ctx.input.clientRequestId) {
      throw gongServiceError(
        'integrationId and clientRequestId are required for get_request_status.'
      );
    }

    let result = await client.getCrmRequestStatus({
      integrationId: ctx.input.integrationId,
      clientRequestId: ctx.input.clientRequestId
    });

    return {
      output: {
        status: result.status,
        errors: result.errors,
        totalErrorCount: result.totalErrorCount,
        totalSuccessCount: result.totalSuccessCount,
        requestId: result.requestId
      },
      message: `Gong CRM request **${ctx.input.clientRequestId}** is ${result.status || 'unknown'}.`
    };
  })
  .build();
