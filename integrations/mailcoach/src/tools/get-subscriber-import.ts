import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSubscriberImport = SlateTool.create(spec, {
  name: 'Get Subscriber Import',
  key: 'get_subscriber_import',
  description: 'Retrieve the current status and result counts of a subscriber import.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      importUuid: z.string().describe('Import UUID returned by import_subscribers')
    })
  )
  .output(
    z.object({
      importUuid: z.string().describe('Unique identifier of the import'),
      emailListUuid: z.string().describe('Email list receiving the import'),
      status: z.string().describe('Current import status'),
      importedSubscribersCount: z
        .number()
        .nullable()
        .describe('Number of imported subscribers'),
      errorCount: z.number().nullable().describe('Number of import errors'),
      subscribeUnsubscribed: z
        .boolean()
        .describe('Whether previously unsubscribed addresses are resubscribed'),
      unsubscribeOthers: z
        .boolean()
        .describe('Whether addresses absent from the CSV are unsubscribed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.config.domain });
    let result = await client.getSubscriberImport(ctx.input.importUuid);

    return {
      output: {
        importUuid: result.uuid,
        emailListUuid: result.email_list_uuid,
        status: result.status,
        importedSubscribersCount: result.imported_subscribers_count ?? null,
        errorCount: result.error_count ?? null,
        subscribeUnsubscribed: result.subscribe_unsubscribed ?? false,
        unsubscribeOthers: result.unsubscribe_others ?? false
      },
      message: `Subscriber import **${result.uuid}** has status **${result.status}**.`
    };
  });
