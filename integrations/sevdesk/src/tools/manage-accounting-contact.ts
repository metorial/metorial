import { SlateTool } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

export let manageAccountingContact = SlateTool.create(spec, {
  name: 'Manage Accounting Contact',
  key: 'manage_accounting_contact',
  description: `Create or update accounting-specific information for a contact, such as debitor/creditor numbers used in bookkeeping. If an accounting contact ID is provided, the existing record is updated; otherwise, a new one is created.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      accountingContactId: z
        .string()
        .optional()
        .describe('ID of existing accounting contact to update (omit to create new)'),
      contactId: z.string().describe('ID of the parent contact'),
      debitorNumber: z.string().optional().describe('Debitor number for bookkeeping'),
      creditorNumber: z.string().optional().describe('Creditor number for bookkeeping')
    })
  )
  .output(
    z.object({
      accountingContactId: z.string().describe('ID of the accounting contact'),
      contactId: z.string(),
      debitorNumber: z.string().optional(),
      creditorNumber: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SevdeskClient({ token: ctx.auth.token });

    let data: Record<string, any> = {
      contact: { id: ctx.input.contactId, objectName: 'Contact' }
    };
    if (ctx.input.debitorNumber !== undefined) data.debitorNumber = ctx.input.debitorNumber;
    if (ctx.input.creditorNumber !== undefined) data.creditorNumber = ctx.input.creditorNumber;

    let result: any;
    if (ctx.input.accountingContactId) {
      result = await client.updateAccountingContact(ctx.input.accountingContactId, data);
    } else {
      result = await client.createAccountingContact(data);
    }

    return {
      output: {
        accountingContactId: String(result.id),
        contactId: ctx.input.contactId,
        debitorNumber: result.debitorNumber ?? undefined,
        creditorNumber: result.creditorNumber ?? undefined
      },
      message: ctx.input.accountingContactId
        ? `Updated accounting contact **${result.id}** for contact **${ctx.input.contactId}**.`
        : `Created accounting contact **${result.id}** for contact **${ctx.input.contactId}**.`
    };
  })
  .build();
