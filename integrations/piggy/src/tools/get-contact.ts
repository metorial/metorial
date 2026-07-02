import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a single contact by UUID or email address. Also returns the contact's credit balance, prepaid balance, tier, and identifiers in a single call.`,
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
      throw new Error('Either contactUuid or email must be provided');
    }

    let contactData: any;
    if (ctx.input.contactUuid) {
      contactData = await client.getContact(ctx.input.contactUuid);
    } else {
      contactData = await client.findContactByEmail(ctx.input.email!);
    }

    let contact = contactData.data || contactData;
    let uuid = contact.uuid;

    let creditBalance: number | undefined;
    let prepaidBalanceInCents: number | undefined;
    let tierName: string | undefined;

    try {
      let creditResult = await client.getContactCreditBalance(uuid);
      creditBalance = creditResult.data?.balance ?? creditResult.balance;
    } catch {
      /* balance may not be available */
    }

    try {
      let prepaidResult = await client.getContactPrepaidBalance(uuid);
      prepaidBalanceInCents =
        prepaidResult.data?.balance_in_cents ?? prepaidResult.balance_in_cents;
    } catch {
      /* prepaid may not be available */
    }

    try {
      let tierResult = await client.getContactTier(uuid);
      tierName = tierResult.data?.name ?? tierResult.name;
    } catch {
      /* tier may not be available */
    }

    return {
      output: {
        contactUuid: uuid,
        email: contact.email,
        firstName: contact.first_name,
        lastName: contact.last_name,
        creditBalance,
        prepaidBalanceInCents,
        tierName,
        createdAt: contact.created_at,
        attributes: contact.attributes || contact
      },
      message: `Retrieved contact **${contact.email || uuid}**${creditBalance !== undefined ? ` with ${creditBalance} credits` : ''}.`
    };
  })
  .build();
