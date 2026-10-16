import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requiredString } from '../lib/response';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a single contact by UUID or email address. Also returns the contact's credit balance, prepaid balance, and tier in a single call.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactUuid: z.string().optional().describe('UUID of the contact to retrieve'),
      email: z.string().optional().describe('Email address to look up the contact')
    })
  )
  .output(
    z.object({
      raw: z.record(z.string(), z.any()).optional().describe('Original provider response'),
      contactUuid: z.string().describe('UUID of the contact'),
      email: z.string().optional().describe('Email address'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      creditBalance: z.number().optional().describe('Current credit balance'),
      prepaidBalanceInCents: z.number().optional().describe('Prepaid balance in cents'),
      tierName: z.string().optional().describe('Current tier name'),
      createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
      attributes: z.record(z.string(), z.any()).optional().describe('All contact attributes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (!ctx.input.contactUuid && !ctx.input.email) {
      throw createApiServiceError('Either contactUuid or email must be provided');
    }

    let contactData: any;
    if (ctx.input.contactUuid) {
      contactData = await client.getContact(ctx.input.contactUuid);
    } else {
      contactData = await client.findContactByEmail(ctx.input.email!);
    }

    let contact = contactData.data;
    let uuid = requiredString(contact.uuid, 'contact UUID');
    let creditBalance = contact.credit_balance?.balance ?? undefined;
    let prepaidBalanceInCents = contact.prepaid_balance?.balance_in_cents ?? undefined;
    let tierName = contact.tier?.name ?? undefined;

    return {
      output: {
        raw: contact,
        contactUuid: uuid,
        email: contact.email ?? undefined,
        firstName: contact.current_values?.firstname ?? contact.first_name ?? undefined,
        lastName: contact.current_values?.lastname ?? contact.last_name ?? undefined,
        creditBalance,
        prepaidBalanceInCents,
        tierName,
        createdAt: contact.created_at ?? contact.current_values?.created_at ?? undefined,
        attributes: isApiErrorRecord(contact.current_values)
          ? contact.current_values
          : isApiErrorRecord(contact.attributes)
            ? contact.attributes
            : undefined
      },
      message: `Retrieved contact **${contact.email || uuid}**${creditBalance !== undefined ? ` with ${creditBalance} credits` : ''}.`
    };
  })
  .build();
