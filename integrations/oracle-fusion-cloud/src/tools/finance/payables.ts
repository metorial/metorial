import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { OracleFusionClient } from '../../lib/client';
import { adfEquals, andFilters } from '../../lib/filters';
import { idField, stringField } from '../../lib/records';
import { pageOutputFields, paginationInputFields } from '../../lib/schemas';
import { spec } from '../../spec';
import {
  invoiceAttachmentFields,
  invoiceAttachmentKey,
  invoiceAttachmentSchema,
  invoiceDistributionFields,
  invoiceDistributionSchema,
  invoiceHoldFields,
  invoiceHoldSchema,
  invoiceInstallmentFields,
  invoiceInstallmentSchema,
  invoiceLineParentKey,
  invoiceParentKey,
  mapInvoiceAttachment,
  mapInvoiceDistribution,
  mapInvoiceHold,
  mapInvoiceInstallment
} from './payables-models';

export const listInvoiceInstallments = SlateTool.create(spec, {
  name: 'List Invoice Installments',
  key: 'list_invoice_installments',
  description:
    'List payment installments for an authorized payables invoice, including due dates, unpaid amounts, and payment holds. Call list_invoices or get_invoice to discover invoiceKey.',
  tags: { readOnly: true }
})
  .input(z.object({ invoiceKey: invoiceParentKey, ...paginationInputFields }).strict())
  .output(z.object({ items: z.array(invoiceInstallmentSchema), ...pageOutputFields }))
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const collection = client.childCollectionPath(
      '/invoices',
      ctx.input.invoiceKey,
      'invoiceInstallments'
    );
    const page = await client.list('fscm', collection, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      orderBy: 'InstallmentNumber:asc',
      fields: invoiceInstallmentFields,
      links: 'self'
    });
    return {
      output: {
        ...page,
        items: page.items.map(record =>
          mapInvoiceInstallment(client, collection, record, ctx.input.invoiceKey)
        )
      },
      message: `Returned ${page.count} invoice installments.`
    };
  })
  .build();

export const listInvoiceLineDistributions = SlateTool.create(spec, {
  name: 'List Invoice Line Distributions',
  key: 'list_invoice_line_distributions',
  description:
    'List accounting distributions for one payables invoice line. Discover invoiceKey with list_invoices or get_invoice, then invoiceLineKey with list_invoice_lines for that same invoice.',
  tags: { readOnly: true }
})
  .input(
    z
      .object({
        invoiceKey: invoiceParentKey,
        invoiceLineKey: invoiceLineParentKey,
        ...paginationInputFields
      })
      .strict()
  )
  .output(z.object({ items: z.array(invoiceDistributionSchema), ...pageOutputFields }))
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const lines = client.childCollectionPath(
      '/invoices',
      ctx.input.invoiceKey,
      'invoiceLines'
    );
    const collection = client.childCollectionPath(
      lines,
      ctx.input.invoiceLineKey,
      'invoiceDistributions'
    );
    const page = await client.list('fscm', collection, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      orderBy: 'InvoiceDistributionId:asc',
      fields: invoiceDistributionFields,
      links: 'self'
    });
    return {
      output: {
        ...page,
        items: page.items.map(record =>
          mapInvoiceDistribution(
            client,
            collection,
            record,
            ctx.input.invoiceKey,
            ctx.input.invoiceLineKey
          )
        )
      },
      message: `Returned ${page.count} invoice line distributions.`
    };
  })
  .build();

export const listInvoiceHolds = SlateTool.create(spec, {
  name: 'List Invoice Holds',
  key: 'list_invoice_holds',
  description:
    'List holds and release details for an authorized payables invoice. Call list_invoices or get_invoice to discover invoiceKey; the invoice number, supplier, and business unit are read from that invoice to scope the search.',
  tags: { readOnly: true }
})
  .input(z.object({ invoiceKey: invoiceParentKey, ...paginationInputFields }).strict())
  .output(z.object({ items: z.array(invoiceHoldSchema), ...pageOutputFields }))
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const invoice = await client.get('fscm', '/invoices', ctx.input.invoiceKey, {
      fields: 'InvoiceId,InvoiceNumber,Supplier,BusinessUnit',
      links: 'self'
    });
    const invoiceId = idField(invoice, 'InvoiceId');
    const invoiceNumber = stringField(invoice, 'InvoiceNumber');
    const supplier = stringField(invoice, 'Supplier');
    const businessUnit = stringField(invoice, 'BusinessUnit');
    if (!invoiceId || !invoiceNumber?.trim() || !supplier?.trim() || !businessUnit?.trim()) {
      throw createApiServiceError(
        'Oracle Fusion did not return the invoice identifiers needed to find its holds. Re-read the invoice with get_invoice.',
        { reason: 'oracle_fusion_missing_invoice_identifiers' }
      );
    }
    const invoiceKey = client.resourceKey(invoice, 'fscm', '/invoices');
    if (invoiceKey !== ctx.input.invoiceKey) {
      throw createApiServiceError('Oracle Fusion returned a different invoice resource key.', {
        reason: 'oracle_fusion_invalid_resource_link'
      });
    }
    const allowedFields = ['InvoiceNumber', 'Supplier', 'BusinessUnit'];
    // InvoiceId is not a documented queryable attribute of invoiceHolds.
    const q = andFilters(
      adfEquals('InvoiceNumber', invoiceNumber, allowedFields),
      adfEquals('Supplier', supplier, allowedFields),
      adfEquals('BusinessUnit', businessUnit, allowedFields)
    );
    const page = await client.list('fscm', '/invoiceHolds', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      q,
      orderBy: 'HoldId:asc',
      fields: invoiceHoldFields,
      links: 'self'
    });
    for (const record of page.items) {
      if (
        stringField(record, 'InvoiceNumber') !== invoiceNumber ||
        stringField(record, 'Supplier') !== supplier ||
        stringField(record, 'BusinessUnit') !== businessUnit
      ) {
        throw createApiServiceError(
          'Oracle Fusion returned a hold outside the selected invoice.',
          {
            reason: 'oracle_fusion_invalid_response'
          }
        );
      }
    }
    return {
      output: {
        ...page,
        items: page.items.map(record => mapInvoiceHold(client, record, invoiceKey, invoiceId))
      },
      message: `Returned ${page.count} invoice holds.`
    };
  })
  .build();

export const listInvoiceAttachments = SlateTool.create(spec, {
  name: 'List Invoice Attachments',
  key: 'list_invoice_attachments',
  description:
    'List document metadata for a payables invoice and discover file keys for download_invoice_attachment. Call list_invoices or get_invoice to discover invoiceKey.',
  tags: { readOnly: true }
})
  .input(z.object({ invoiceKey: invoiceParentKey, ...paginationInputFields }).strict())
  .output(z.object({ items: z.array(invoiceAttachmentSchema), ...pageOutputFields }))
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const collection = client.childCollectionPath(
      '/invoices',
      ctx.input.invoiceKey,
      'attachments'
    );
    const page = await client.list('fscm', collection, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      orderBy: 'AttachedDocumentId:asc',
      fields: invoiceAttachmentFields,
      links: 'self'
    });
    return {
      output: {
        ...page,
        items: page.items.map(record =>
          mapInvoiceAttachment(client, collection, record, ctx.input.invoiceKey)
        )
      },
      message: `Returned ${page.count} invoice document records.`
    };
  })
  .build();

export const downloadInvoiceAttachment = SlateTool.create(spec, {
  name: 'Download Invoice Attachment',
  key: 'download_invoice_attachment',
  description:
    'Prepare a downloadable file from a payables invoice document. Call list_invoice_attachments to discover attachmentKey and preserve its invoiceKey.',
  instructions: [
    'Requires a file document with an Oracle FileContents download link. Text and URL-only documents without this link cannot be downloaded.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({ invoiceKey: invoiceParentKey, attachmentKey: invoiceAttachmentKey }).strict()
  )
  .output(invoiceAttachmentSchema)
  .handleInvocation(async ctx => {
    const client = new OracleFusionClient(ctx.auth);
    const collection = client.childCollectionPath(
      '/invoices',
      ctx.input.invoiceKey,
      'attachments'
    );
    const record = await client.get('fscm', collection, ctx.input.attachmentKey, {
      fields: invoiceAttachmentFields,
      links: 'self,enclosure'
    });
    const output = mapInvoiceAttachment(client, collection, record, ctx.input.invoiceKey);
    if (output.resourceKey !== ctx.input.attachmentKey) {
      throw createApiServiceError(
        'Oracle Fusion returned a different document resource key.',
        {
          reason: 'oracle_fusion_invalid_resource_link'
        }
      );
    }
    if (output.type !== 'File' || !output.fileName?.trim()) {
      throw createApiServiceError(
        'This document is not a file with an available filename. Select a File document from list_invoice_attachments.',
        { reason: 'oracle_fusion_document_not_downloadable' }
      );
    }
    const url = client.invoiceAttachmentEnclosureUrl(
      record,
      ctx.input.invoiceKey,
      ctx.input.attachmentKey
    );
    await ctx.addAttachment({
      type: 'url',
      url,
      filename: output.fileName,
      mimeType: output.mimeType,
      headers: { Authorization: `Bearer ${ctx.auth.token}` }
    });
    return {
      output,
      message: 'Prepared the invoice file for download.'
    };
  })
  .build();
