import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listServices = SlateTool.create(spec, {
  name: 'List Services',
  key: 'list_services',
  description: `Retrieve scanning services from your CodeREADr account. Services are custom workflows that define how app users capture and collect data. Returns service configuration including validation method, associated users, questions, and settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serviceId: z
        .string()
        .optional()
        .describe('Specific service ID to retrieve. Leave empty to retrieve all services.')
    })
  )
  .output(
    z.object({
      services: z
        .array(
          z
            .object({
              serviceId: z.string().describe('Unique ID of the service'),
              name: z.string().optional().describe('Name of the service'),
              validationMethod: z
                .string()
                .optional()
                .describe('Validation method (record, database, postback, etc.)'),
              description: z.string().optional().describe('Service description'),
              duplicateValue: z
                .string()
                .optional()
                .describe('Duplicate scan handling setting'),
              users: z
                .array(
                  z.object({
                    userId: z.string(),
                    username: z.string()
                  })
                )
                .optional()
                .describe('Users authorized for this service'),
              questions: z
                .array(
                  z.object({
                    questionId: z.string(),
                    text: z.string()
                  })
                )
                .optional()
                .describe('Questions attached to this service')
            })
            .passthrough()
        )
        .describe('List of services')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let services = await client.retrieveServices(ctx.input.serviceId);

    return {
      output: { services },
      message: ctx.input.serviceId
        ? `Retrieved service **${ctx.input.serviceId}**.`
        : `Retrieved **${services.length}** service(s).`
    };
  })
  .build();
