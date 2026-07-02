import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getOrganization = SlateTool.create(spec, {
  name: 'Get Organization',
  key: 'get_organization',
  description: `Retrieve information about the current organization, including usage statistics, subscription details, and billing information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeUsage: z
        .boolean()
        .optional()
        .describe('Whether to include organization usage statistics'),
      includeSubscription: z
        .boolean()
        .optional()
        .describe('Whether to include subscription details'),
      includeInvoices: z.boolean().optional().describe('Whether to include invoice history')
    })
  )
  .output(
    z.object({
      organizationName: z.string().describe('Organization display name'),
      organizationSlug: z.string().describe('Organization slug'),
      type: z.string().describe('Organization type'),
      overages: z.boolean().describe('Whether overages are enabled'),
      blockedReads: z.boolean().describe('Whether reads are blocked'),
      blockedWrites: z.boolean().describe('Whether writes are blocked'),
      usage: z
        .object({
          rowsRead: z.number(),
          rowsWritten: z.number(),
          storageBytes: z.number(),
          databases: z.number(),
          locations: z.number(),
          groups: z.number()
        })
        .optional()
        .describe('Organization usage statistics'),
      subscription: z.string().optional().describe('Current subscription plan'),
      invoices: z
        .array(
          z.object({
            invoiceNumber: z.string(),
            amountDue: z.string(),
            dueDate: z.string(),
            paidAt: z.string(),
            paymentFailedAt: z.string(),
            invoicePdf: z.string()
          })
        )
        .optional()
        .describe('Invoice history')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationSlug: ctx.config.organizationSlug
    });

    let org = await client.getOrganization();

    let output: Record<string, unknown> = {
      organizationName: org.name,
      organizationSlug: org.slug,
      type: org.type,
      overages: org.overages,
      blockedReads: org.blocked_reads,
      blockedWrites: org.blocked_writes
    };

    if (ctx.input.includeUsage) {
      let usageResult = await client.getOrganizationUsage();
      let u = usageResult.organization.usage;
      output.usage = {
        rowsRead: u.rows_read,
        rowsWritten: u.rows_written,
        storageBytes: u.storage_bytes,
        databases: u.databases,
        locations: u.locations,
        groups: u.groups
      };
    }

    if (ctx.input.includeSubscription) {
      let sub = await client.getOrganizationSubscription();
      output.subscription = sub.subscription;
    }

    if (ctx.input.includeInvoices) {
      let invoiceResult = await client.listInvoices();
      output.invoices = invoiceResult.invoices.map(inv => ({
        invoiceNumber: inv.invoice_number,
        amountDue: inv.amount_due,
        dueDate: inv.due_date,
        paidAt: inv.paid_at,
        paymentFailedAt: inv.payment_failed_at,
        invoicePdf: inv.invoice_pdf
      }));
    }

    return {
      output: output as any,
      message: `Organization **${org.name}** (${org.slug}), type: ${org.type}.`
    };
  })
  .build();
