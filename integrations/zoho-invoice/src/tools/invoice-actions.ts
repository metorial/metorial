import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let invoiceActions = SlateTool.create(spec, {
  name: 'Invoice Actions',
  key: 'invoice_actions',
  description: `Perform various actions on a Zoho Invoice. Supported actions include marking an invoice as sent or draft, voiding an invoice, writing off an invoice, cancelling a write-off, and sending an invoice via email.`,
  instructions: [
    'For the send_email action, provide at least emailRecipients with one or more email addresses.',
    'emailSubject and emailBody are optional for send_email but recommended for clarity.',
    'Actions other than send_email do not require email-related fields.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      invoiceId: z.string().describe('ID of the invoice'),
      action: z
        .enum([
          'mark_as_sent',
          'mark_as_draft',
          'void',
          'write_off',
          'cancel_write_off',
          'send_email'
        ])
        .describe('Action to perform on the invoice'),
      emailRecipients: z
        .array(z.string())
        .optional()
        .describe('Email addresses to send the invoice to (for send_email action)'),
      emailSubject: z.string().optional().describe('Email subject (for send_email action)'),
      emailBody: z.string().optional().describe('Email body (for send_email action)')
    })
  )
  .output(
    z.object({
      invoiceId: z.string(),
      action: z.string(),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      region: ctx.auth.region
    });

    let { invoiceId, action, emailRecipients, emailSubject, emailBody } = ctx.input;

    switch (action) {
      case 'mark_as_sent': {
        await client.markInvoiceAsSent(invoiceId);
        break;
      }
      case 'mark_as_draft': {
        await client.markInvoiceAsDraft(invoiceId);
        break;
      }
      case 'void': {
        await client.voidInvoice(invoiceId);
        break;
      }
      case 'write_off': {
        await client.writeOffInvoice(invoiceId);
        break;
      }
      case 'cancel_write_off': {
        await client.cancelWriteOff(invoiceId);
        break;
      }
      case 'send_email': {
        await client.emailInvoice(invoiceId, {
          to_mail_ids: emailRecipients,
          subject: emailSubject,
          body: emailBody
        });
        break;
      }
    }

    let actionLabels: Record<string, string> = {
      mark_as_sent: 'marked as sent',
      mark_as_draft: 'marked as draft',
      void: 'voided',
      write_off: 'written off',
      cancel_write_off: 'write-off cancelled',
      send_email: 'sent via email'
    };

    return {
      output: {
        invoiceId,
        action,
        success: true
      },
      message: `Invoice **${invoiceId}** has been ${actionLabels[action]}.`
    };
  })
  .build();
