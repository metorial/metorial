import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let associateContactWithAccount = SlateTool.create(spec, {
  name: 'Associate Contact with Account',
  key: 'associate_contact_with_account',
  description:
    'Associates a contact with an account/company using ActiveCampaign account-contact relationships.',
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to associate'),
      accountId: z.string().describe('ID of the account/company to associate'),
      jobTitle: z
        .string()
        .optional()
        .describe('Optional job title for the contact at the account')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      accountContactId: z.string().optional(),
      contactId: z.string(),
      accountId: z.string(),
      jobTitle: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    let result = await client.associateContactWithAccount(
      ctx.input.contactId,
      ctx.input.accountId,
      ctx.input.jobTitle
    );
    let accountContact = result.accountContact;

    return {
      output: {
        success: true,
        accountContactId: accountContact?.id || undefined,
        contactId: accountContact?.contact || ctx.input.contactId,
        accountId: accountContact?.account || ctx.input.accountId,
        jobTitle: accountContact?.jobTitle || ctx.input.jobTitle || undefined
      },
      message: `Contact (ID: ${ctx.input.contactId}) associated with account (ID: ${ctx.input.accountId}).`
    };
  })
  .build();
