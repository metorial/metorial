import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listRecipients = SlateTool.create(spec, {
  name: 'List Recipients',
  key: 'list_recipients',
  description: `Retrieve a paginated list of recipients who have been sent emails. Optionally filter by domain.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domainId: z.string().optional().describe('Filter recipients by domain ID.'),
      page: z.number().optional().describe('Page number for pagination.'),
      limit: z
        .number()
        .min(10)
        .max(100)
        .optional()
        .describe('Results per page (10-100, default 25).')
    })
  )
  .output(
    z.object({
      recipients: z
        .array(
          z.object({
            recipientId: z.string().describe('Recipient ID.'),
            email: z.string().describe('Recipient email address.'),
            createdAt: z.string().describe('First seen timestamp.')
          })
        )
        .describe('List of recipients.'),
      total: z.number().describe('Total number of recipients.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listRecipients({
      domainId: ctx.input.domainId,
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let recipients = (result.data || []).map((r: Record<string, unknown>) => ({
      recipientId: String(r.id || ''),
      email: String(r.email || ''),
      createdAt: String(r.created_at || '')
    }));

    let total =
      ((result.meta as Record<string, unknown>)?.total as number) ?? recipients.length;

    return {
      output: { recipients, total },
      message: `Found **${total}** recipients.`
    };
  })
  .build();

export let getRecipient = SlateTool.create(spec, {
  name: 'Get Recipient',
  key: 'get_recipient',
  description: `Retrieve detailed information about a specific recipient, including their email history and domain information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      recipientId: z.string().describe('ID of the recipient to retrieve.')
    })
  )
  .output(
    z.object({
      recipientId: z.string().describe('Recipient ID.'),
      email: z.string().describe('Recipient email address.'),
      recipientData: z
        .record(z.string(), z.unknown())
        .describe('Full recipient data including email history.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getRecipient(ctx.input.recipientId);
    let r = result.data;

    return {
      output: {
        recipientId: String(r.id || ''),
        email: String(r.email || ''),
        recipientData: r
      },
      message: `Retrieved recipient **${r.email}** (\`${r.id}\`).`
    };
  })
  .build();

export let deleteRecipient = SlateTool.create(spec, {
  name: 'Delete Recipient',
  key: 'delete_recipient',
  description: `Permanently delete a recipient record. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      recipientId: z.string().describe('ID of the recipient to delete.')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the recipient was successfully deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteRecipient(ctx.input.recipientId);

    return {
      output: { deleted: true },
      message: `Recipient \`${ctx.input.recipientId}\` deleted successfully.`
    };
  })
  .build();
