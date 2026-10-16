import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { PostalyticsClient } from '../lib/client';
import { spec } from '../spec';

export let whoAmI = SlateTool.create(spec, {
  name: 'Get Current Account',
  key: 'who_am_i',
  description: 'Retrieve the authenticated Postalytics account identity and contact details.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ account: z.record(z.string(), z.unknown()) }))
  .handleInvocation(async ctx => {
    let client = new PostalyticsClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });
    let account = await client.getMyAccount();
    return {
      output: {
        account: pickDefined({
          account_id: account.account_id,
          username: account.username,
          first_name: account.first_name,
          last_name: account.last_name,
          email_address: account.email_address,
          company: account.company,
          phone: account.phone,
          address_street: account.address_street,
          address_city: account.address_city,
          address_state: account.address_state,
          address_zip: account.address_zip,
          created_date: account.created_date
        })
      },
      message: 'Retrieved your Postalytics account identity.'
    };
  })
  .build();
