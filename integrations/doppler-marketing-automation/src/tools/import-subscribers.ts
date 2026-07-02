import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let importSubscribers = SlateTool.create(spec, {
  name: 'Import Subscribers',
  key: 'import_subscribers',
  description: `Bulk import subscribers into a list. Creates new subscribers and updates existing ones.
The import runs asynchronously and returns a task ID that can be used to check the import status.`,
  constraints: [
    'Maximum 10,000 subscribers per request.',
    'Fields not in the fields list retain their previous values. Fields in the list but absent from a subscriber become empty.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.number().describe('ID of the list to import subscribers into'),
      subscribers: z
        .array(
          z.object({
            email: z.string().describe('Email address of the subscriber'),
            fields: z
              .array(
                z.object({
                  name: z.string().describe('Field name'),
                  value: z.string().describe('Field value')
                })
              )
              .optional()
              .describe('Custom field values for this subscriber')
          })
        )
        .describe('Array of subscribers to import'),
      fieldNames: z
        .array(z.string())
        .optional()
        .describe(
          'List of field names to consider during import. Fields in this list but absent from a subscriber will be cleared.'
        ),
      callbackUrl: z
        .string()
        .optional()
        .describe('URL to receive a POST notification when the import completes')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the import task for tracking progress'),
      message: z.string().describe('Result message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.config.accountEmail
    });

    let result = await client.importSubscribers(
      ctx.input.listId,
      ctx.input.subscribers,
      ctx.input.fieldNames,
      ctx.input.callbackUrl
    );

    return {
      output: {
        taskId: result.createdResourceId,
        message: result.message
      },
      message: `Import of **${ctx.input.subscribers.length}** subscribers into list \`${ctx.input.listId}\` started. Task ID: \`${result.createdResourceId}\`.`
    };
  })
  .build();
