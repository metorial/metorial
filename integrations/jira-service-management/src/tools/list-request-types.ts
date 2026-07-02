import { SlateTool } from 'slates';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

export let listRequestTypesTool = SlateTool.create(spec, {
  name: 'List Request Types',
  key: 'list_request_types',
  description: `List request types available for a service desk, including their field definitions. Useful for discovering which request types are available and what fields they require before creating a customer request.`,
  instructions: [
    'Set includeFields to true to also retrieve the required and optional fields for each request type.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serviceDeskId: z.string().describe('ID of the service desk'),
      includeFields: z
        .boolean()
        .optional()
        .describe('Whether to include field definitions for each request type'),
      start: z.number().optional().describe('Starting index for pagination'),
      limit: z.number().optional().describe('Maximum number of results')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of request types'),
      requestTypes: z
        .array(
          z.object({
            requestTypeId: z.string().describe('ID of the request type'),
            name: z.string().describe('Name of the request type'),
            description: z.string().optional().describe('Description of the request type'),
            helpText: z.string().optional().describe('Help text for the request type'),
            serviceDeskId: z.string().describe('Associated service desk ID'),
            groupIds: z
              .array(z.string())
              .optional()
              .describe('Group IDs the request type belongs to'),
            fields: z
              .array(
                z.object({
                  fieldId: z.string().describe('Field ID'),
                  name: z.string().describe('Field name'),
                  required: z.boolean().describe('Whether the field is required'),
                  description: z.string().optional().describe('Field description')
                })
              )
              .optional()
              .describe('Field definitions for this request type')
          })
        )
        .describe('Available request types')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId
    });

    let result = await client.getRequestTypes(
      ctx.input.serviceDeskId,
      ctx.input.start,
      ctx.input.limit
    );

    let requestTypes = await Promise.all(
      (result.values || []).map(async (rt: any) => {
        let requestType: any = {
          requestTypeId: String(rt.id),
          name: rt.name,
          description: rt.description,
          helpText: rt.helpText,
          serviceDeskId: String(rt.serviceDeskId),
          groupIds: rt.groupIds?.map(String)
        };

        if (ctx.input.includeFields) {
          try {
            let fieldsResult = await client.getRequestTypeFields(
              ctx.input.serviceDeskId,
              String(rt.id)
            );
            requestType.fields = (fieldsResult.requestTypeFields || []).map((f: any) => ({
              fieldId: f.fieldId,
              name: f.name,
              required: f.required || false,
              description: f.description
            }));
          } catch {
            requestType.fields = [];
          }
        }

        return requestType;
      })
    );

    return {
      output: {
        total: result.size || requestTypes.length,
        requestTypes
      },
      message: `Found **${requestTypes.length}** request types for service desk ${ctx.input.serviceDeskId}.`
    };
  })
  .build();
