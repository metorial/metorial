import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { clientForContext } from '../lib/client';
import { spec } from '../spec';

const outputSchema = z.object({
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
        dueDate: z.string().optional(),
        paidAt: z.string().optional(),
        paymentFailedAt: z.string().optional(),
        invoicePdf: z.string().optional()
      })
    )
    .optional()
    .describe('Invoice history')
});

export let getOrganization = SlateTool.create(spec, {
  name: 'Get Organization',
  key: 'get_organization',
  description: `Choose an organization with list_organizations. Retrieve information about the current organization, including usage statistics, subscription details, and billing information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationSlug: z
        .string()
        .optional()
        .describe(
          'Organization slug. Call list_organizations to discover authorized organizations; older connections may use their saved organization.'
        ),
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
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const client = clientForContext(ctx);

    let org = await client.getOrganization();

    let output: z.infer<typeof outputSchema> = {
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
      output.subscription =
        typeof sub.subscription === 'string'
          ? sub.subscription
          : (sub.subscription.name ?? sub.subscription.plan);
      if (!output.subscription)
        throw createApiServiceError('Turso returned a subscription without a plan name.');
    }

    if (ctx.input.includeInvoices) {
      let invoiceResult = await client.listInvoices();
      output.invoices = invoiceResult.invoices.map(inv => ({
        invoiceNumber: inv.invoice_number,
        amountDue: inv.amount_due,
        dueDate: inv.due_date ?? undefined,
        paidAt: inv.paid_at ?? undefined,
        paymentFailedAt: inv.payment_failed_at ?? undefined,
        invoicePdf: inv.invoice_pdf ?? undefined
      }));
    }

    return {
      output,
      message: `Organization **${org.name}** (${org.slug}), type: ${org.type}.`
    };
  })
  .build();
