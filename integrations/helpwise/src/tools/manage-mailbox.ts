import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageMailbox = SlateTool.create(spec, {
  name: 'Manage Mailbox',
  key: 'manage_mailbox',
  description: `Create, retrieve, update, or delete a shared mailbox. Use this to set up new shared inboxes (e.g., support@, sales@), modify existing ones, or remove mailboxes no longer needed.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['get', 'create', 'update', 'delete'])
        .describe('The operation to perform on the mailbox'),
      mailboxId: z
        .string()
        .optional()
        .describe('Mailbox ID (required for get, update, delete)'),
      email: z
        .string()
        .optional()
        .describe('Email address for the mailbox (required for create)'),
      displayName: z
        .string()
        .optional()
        .describe('Display name for the mailbox (required for create, optional for update)')
    })
  )
  .output(
    z.object({
      mailbox: z
        .record(z.string(), z.any())
        .optional()
        .describe('Mailbox details (for get, create, update)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, mailboxId, email, displayName } = ctx.input;

    if (action === 'get') {
      if (!mailboxId) throw new Error('mailboxId is required for get action');
      let mailbox = await client.getMailbox(mailboxId);
      return {
        output: { mailbox, success: true },
        message: `Retrieved mailbox **${mailboxId}**.`
      };
    }

    if (action === 'create') {
      if (!email) throw new Error('email is required for create action');
      if (!displayName) throw new Error('displayName is required for create action');
      let mailbox = await client.createMailbox({ email, display_name: displayName });
      return {
        output: { mailbox, success: true },
        message: `Created mailbox **${email}** (${displayName}).`
      };
    }

    if (action === 'update') {
      if (!mailboxId) throw new Error('mailboxId is required for update action');
      let updateData: Record<string, any> = {};
      if (displayName !== undefined) updateData.display_name = displayName;
      if (email !== undefined) updateData.email = email;
      let mailbox = await client.updateMailbox(mailboxId, updateData);
      return {
        output: { mailbox, success: true },
        message: `Updated mailbox **${mailboxId}**.`
      };
    }

    if (action === 'delete') {
      if (!mailboxId) throw new Error('mailboxId is required for delete action');
      await client.deleteMailbox(mailboxId);
      return {
        output: { success: true },
        message: `Deleted mailbox **${mailboxId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
