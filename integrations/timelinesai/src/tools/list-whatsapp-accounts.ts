import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWhatsAppAccounts = SlateTool.create(spec, {
  name: 'List WhatsApp Accounts',
  key: 'list_whatsapp_accounts',
  description: `List all WhatsApp accounts connected to the workspace. Returns account ID, phone number, status, owner details, and connection info. Useful for selecting which account to send messages from.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accounts: z
        .array(
          z.object({
            accountId: z.string().describe('WhatsApp account ID'),
            phone: z.string().optional().describe('Phone number in international format'),
            status: z.string().optional().describe('Account connection status (e.g., Active)'),
            ownerName: z.string().optional().describe('Account owner display name'),
            ownerEmail: z.string().optional().describe('Account owner email'),
            accountName: z.string().optional().describe('Account display name'),
            connectedOn: z.string().optional().describe('Connection timestamp')
          })
        )
        .describe('List of connected WhatsApp accounts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getWhatsAppAccounts();

    let accounts = (result?.data?.whatsapp_accounts || []).map((a: any) => ({
      accountId: a.id,
      phone: a.phone,
      status: a.status,
      ownerName: a.owner_name,
      ownerEmail: a.owner_email,
      accountName: a.account_name,
      connectedOn: a.connected_on
    }));

    return {
      output: { accounts },
      message: `Found **${accounts.length}** connected WhatsApp account(s).`
    };
  })
  .build();
