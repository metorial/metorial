import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let importSubscribers = SlateTool.create(spec, {
  name: 'Import Subscribers',
  key: 'import_subscribers',
  description: `Bulk import subscribers into an email list using CSV data. The import is created and then started automatically. Returns the import status and counts.`,
  instructions: [
    'The CSV data should include at minimum an "email" column. Other supported columns include "first_name", "last_name", and "tags".'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      emailListUuid: z.string().describe('UUID of the email list to import subscribers into'),
      subscribersCsv: z.string().describe('CSV data containing subscriber information'),
      subscribeUnsubscribed: z
        .boolean()
        .optional()
        .describe('Whether to re-subscribe previously unsubscribed addresses'),
      unsubscribeOthers: z
        .boolean()
        .optional()
        .describe('Whether to unsubscribe addresses not in the import')
    })
  )
  .output(
    z.object({
      importUuid: z.string().describe('UUID of the import'),
      status: z.string().describe('Current status of the import'),
      importedSubscribersCount: z
        .number()
        .nullable()
        .describe('Number of subscribers imported'),
      errorCount: z.number().nullable().describe('Number of errors during import')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    let importResult = await client.createSubscriberImport({
      email_list_uuid: ctx.input.emailListUuid,
      subscribers_csv: ctx.input.subscribersCsv,
      subscribe_unsubscribed: ctx.input.subscribeUnsubscribed,
      unsubscribe_others: ctx.input.unsubscribeOthers
    });

    let started = await client.startSubscriberImport(importResult.uuid);

    return {
      output: {
        importUuid: started.uuid,
        status: started.status ?? 'pending',
        importedSubscribersCount: started.imported_subscribers_count ?? null,
        errorCount: started.error_count ?? null
      },
      message: `Subscriber import **${started.uuid}** has been created and started with status **${started.status ?? 'pending'}**.`
    };
  });
