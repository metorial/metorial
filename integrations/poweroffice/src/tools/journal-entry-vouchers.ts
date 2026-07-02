import { SlateTool } from 'slates';
import { z } from 'zod';
import { compact } from '../lib/client';
import { powerOfficeValidationError } from '../lib/errors';
import { spec } from '../spec';
import {
  buildListParams,
  compactOutput,
  createClient,
  numberValue,
  pageSummary,
  paginationInputSchema,
  paginationOutputSchema,
  rawRecordSchema,
  stringValue
} from './shared';

let journalEntryVoucherSchema = z.object({
  id: z.string().optional().describe('Journal entry voucher id.'),
  type: z.string().optional().describe('Journal entry voucher type.'),
  voucherNo: z.number().optional().describe('Voucher number.'),
  voucherDate: z.string().optional().describe('Voucher date.'),
  description: z.string().optional().describe('Description.'),
  isPosted: z.boolean().optional().describe('Whether the voucher is posted.'),
  inApprovalWorkflow: z.boolean().optional().describe('Whether it is in approval workflow.'),
  createdDateTimeOffset: z.string().optional().describe('Created timestamp.'),
  lastChangedDateTimeOffset: z.string().optional().describe('Last changed timestamp.'),
  record: rawRecordSchema
});

let supplierVoucherLineInputSchema = z.object({
  debitAccountId: z.number().int().optional().describe('Debit account id.'),
  creditAccountId: z.number().int().optional().describe('Credit account id.'),
  debitVatId: z.number().int().optional().describe('Debit VAT id.'),
  creditVatId: z.number().int().optional().describe('Credit VAT id.'),
  description: z.string().optional().describe('Line description.'),
  currencyAmount: z.number().optional().describe('Line amount in voucher currency.'),
  productId: z.number().int().optional().describe('Product id.'),
  quantity: z.number().optional().describe('Quantity.'),
  quantity2: z.number().optional().describe('Secondary quantity.'),
  projectId: z.number().int().optional().describe('Project id.'),
  departmentId: z.number().int().optional().describe('Department id.'),
  locationId: z.number().int().optional().describe('Location id.'),
  dim1Id: z.number().int().optional().describe('Custom dimension 1 id.'),
  dim2Id: z.number().int().optional().describe('Custom dimension 2 id.'),
  dim3Id: z.number().int().optional().describe('Custom dimension 3 id.')
});

let supplierInvoiceVoucherSchema = z.object({
  id: z.string().optional().describe('Supplier invoice journal entry voucher id.'),
  invoiceNo: z.string().optional().describe('Supplier invoice number.'),
  voucherDate: z.string().optional().describe('Voucher date.'),
  dueDate: z.string().optional().describe('Due date.'),
  description: z.string().optional().describe('Description.'),
  currencyCode: z.string().optional().describe('Currency code.'),
  currencyAmount: z.number().optional().describe('Currency amount.'),
  supplierAccountId: z.number().optional().describe('Supplier account id.'),
  supplierContactId: z.number().optional().describe('Supplier contact id.'),
  voucherState: z.string().optional().describe('Voucher state.'),
  approvalState: z.string().optional().describe('Approval state.'),
  createdDateTimeOffset: z.string().optional().describe('Created timestamp.'),
  lastChangedDateTimeOffset: z.string().optional().describe('Last changed timestamp.'),
  record: rawRecordSchema
});

let voucherApprovalSchema = z.object({
  voucherId: z.string().optional().describe('Voucher id.'),
  type: z.string().optional().describe('Voucher type.'),
  availableFromDateTimeOffset: z.string().optional().describe('Available timestamp.'),
  record: rawRecordSchema
});

let voucherApprovalStatusSchema = z.object({
  voucherId: z.string().optional().describe('Voucher id.'),
  inApprovalWorkflow: z.boolean().optional().describe('Whether it remains in workflow.'),
  isPosted: z.boolean().optional().describe('Whether the voucher is posted.'),
  record: rawRecordSchema
});

let mapJournalEntryVoucher = (voucher: Record<string, unknown>) => ({
  ...compactOutput({
    id: stringValue(voucher, 'Id') ?? stringValue(voucher, 'VoucherId'),
    type: stringValue(voucher, 'Type') ?? stringValue(voucher, 'VoucherType'),
    voucherNo: numberValue(voucher, 'VoucherNo'),
    voucherDate: stringValue(voucher, 'VoucherDate'),
    description: stringValue(voucher, 'Description'),
    isPosted:
      typeof voucher.IsPosted === 'boolean' ? (voucher.IsPosted as boolean) : undefined,
    inApprovalWorkflow:
      typeof voucher.InApprovalWorkflow === 'boolean'
        ? (voucher.InApprovalWorkflow as boolean)
        : undefined,
    createdDateTimeOffset: stringValue(voucher, 'CreatedDateTimeOffset'),
    lastChangedDateTimeOffset: stringValue(voucher, 'LastChangedDateTimeOffset')
  }),
  record: voucher
});

let mapSupplierInvoiceVoucher = (voucher: Record<string, unknown>) => ({
  ...compactOutput({
    id: stringValue(voucher, 'Id'),
    invoiceNo: stringValue(voucher, 'InvoiceNo'),
    voucherDate: stringValue(voucher, 'VoucherDate'),
    dueDate: stringValue(voucher, 'DueDate'),
    description: stringValue(voucher, 'Description'),
    currencyCode: stringValue(voucher, 'CurrencyCode'),
    currencyAmount: numberValue(voucher, 'CurrencyAmount'),
    supplierAccountId: numberValue(voucher, 'SupplierAccountId'),
    supplierContactId: numberValue(voucher, 'SupplierContactId'),
    voucherState: stringValue(voucher, 'VoucherState'),
    approvalState: stringValue(voucher, 'ApprovalState'),
    createdDateTimeOffset: stringValue(voucher, 'CreatedDateTimeOffset'),
    lastChangedDateTimeOffset: stringValue(voucher, 'LastChangedDateTimeOffset')
  }),
  record: voucher
});

let mapVoucherApproval = (approval: Record<string, unknown>) => ({
  ...compactOutput({
    voucherId: stringValue(approval, 'VoucherId'),
    type: stringValue(approval, 'Type') ?? stringValue(approval, 'VoucherType'),
    availableFromDateTimeOffset: stringValue(approval, 'AvailableFromDateTimeOffset')
  }),
  record: approval
});

let mapVoucherApprovalStatus = (status: Record<string, unknown>) => ({
  ...compactOutput({
    voucherId: stringValue(status, 'VoucherId'),
    inApprovalWorkflow:
      typeof status.InApprovalWorkflow === 'boolean'
        ? (status.InApprovalWorkflow as boolean)
        : undefined,
    isPosted: typeof status.IsPosted === 'boolean' ? (status.IsPosted as boolean) : undefined
  }),
  record: status
});

let buildSupplierVoucherLine = (line: z.infer<typeof supplierVoucherLineInputSchema>) =>
  compact({
    DebitAccountId: line.debitAccountId,
    CreditAccountId: line.creditAccountId,
    DebitVatId: line.debitVatId,
    CreditVatId: line.creditVatId,
    Description: line.description,
    CurrencyAmount: line.currencyAmount,
    ProductId: line.productId,
    Quantity: line.quantity,
    Quantity2: line.quantity2,
    ProjectId: line.projectId,
    DepartmentId: line.departmentId,
    LocationId: line.locationId,
    Dim1Id: line.dim1Id,
    Dim2Id: line.dim2Id,
    Dim3Id: line.dim3Id
  });

export let powerofficeListJournalEntryVouchers = SlateTool.create(spec, {
  name: 'List PowerOffice Journal Entry Vouchers',
  key: 'poweroffice_list_journal_entry_vouchers',
  description:
    'List PowerOffice journal entry voucher drafts and approval workflow state without posting vouchers.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      createdDateTimeOffsetGreaterThan: z
        .string()
        .optional()
        .describe('Return vouchers created after this timestamp.'),
      lastChangedDateTimeOffsetGreaterThan: z
        .string()
        .optional()
        .describe('Return vouchers changed after this timestamp.'),
      inApprovalWorkflow: z
        .boolean()
        .optional()
        .describe('Filter by approval workflow state.'),
      isPosted: z.boolean().optional().describe('Filter by posted state.'),
      ...paginationInputSchema
    })
  )
  .output(
    z.object({
      vouchers: z.array(journalEntryVoucherSchema).describe('Journal entry vouchers.'),
      page: paginationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let vouchers = await client.listJournalEntryVouchers(
      buildListParams(ctx.input, {
        createdDateTimeOffsetGreaterThan: ctx.input.createdDateTimeOffsetGreaterThan,
        lastChangedDateTimeOffsetGreaterThan: ctx.input.lastChangedDateTimeOffsetGreaterThan,
        inApprovalWorkflow: ctx.input.inApprovalWorkflow,
        isPosted: ctx.input.isPosted
      })
    );

    return {
      output: {
        vouchers: vouchers.map(mapJournalEntryVoucher),
        page: pageSummary(ctx.input, vouchers.length)
      },
      message: `Retrieved **${vouchers.length}** PowerOffice journal entry voucher(s).`
    };
  })
  .build();

export let powerofficeCreateSupplierInvoiceVoucherDraft = SlateTool.create(spec, {
  name: 'Create PowerOffice Supplier Invoice Voucher Draft',
  key: 'poweroffice_create_supplier_invoice_voucher_draft',
  description:
    'Create a PowerOffice supplier invoice journal entry voucher draft for user review and approval workflow submission.',
  constraints: [
    'This creates a journal entry voucher draft in PowerOffice. It does not directly post the voucher.',
    'Direct voucher posting is intentionally not exposed by this tool.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      invoiceNo: z.string().min(1).describe('Supplier invoice number.'),
      voucherDate: z.string().min(1).describe('Voucher date (YYYY-MM-DD).'),
      currencyCode: z.string().min(1).describe('Currency code.'),
      supplierAccountId: z.number().int().optional().describe('Supplier account id.'),
      supplierBankAccountId: z.number().int().optional().describe('Supplier bank account id.'),
      clientBankAccountId: z.number().int().optional().describe('Client bank account id.'),
      currencyAmount: z.number().optional().describe('Total amount in voucher currency.'),
      currencyExchangeRate: z.number().optional().describe('Currency exchange rate.'),
      description: z.string().optional().describe('Voucher description.'),
      comment: z.string().optional().describe('Internal voucher comment.'),
      dueDate: z.string().optional().describe('Due date (YYYY-MM-DD).'),
      paymentDate: z.string().optional().describe('Payment date (YYYY-MM-DD).'),
      paymentOnHold: z.boolean().optional().describe('Put payment on hold.'),
      payout: z.boolean().optional().describe('Whether payout is enabled.'),
      purchaseOrderReference: z.string().optional().describe('Purchase order reference.'),
      projectId: z.number().int().optional().describe('Project id.'),
      departmentId: z.number().int().optional().describe('Department id.'),
      locationId: z.number().int().optional().describe('Location id.'),
      dim1Id: z.number().int().optional().describe('Custom dimension 1 id.'),
      dim2Id: z.number().int().optional().describe('Custom dimension 2 id.'),
      dim3Id: z.number().int().optional().describe('Custom dimension 3 id.'),
      lines: z
        .array(supplierVoucherLineInputSchema)
        .optional()
        .describe('Optional supplier voucher lines to include in the draft.')
    })
  )
  .output(
    z.object({
      voucher: supplierInvoiceVoucherSchema.describe('Created supplier invoice voucher draft.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let voucher = await client.createSupplierInvoiceJournalEntryVoucher(
      compact({
        InvoiceNo: ctx.input.invoiceNo,
        VoucherDate: ctx.input.voucherDate,
        CurrencyCode: ctx.input.currencyCode,
        SupplierAccountId: ctx.input.supplierAccountId,
        SupplierBankAccountId: ctx.input.supplierBankAccountId,
        ClientBankAccountId: ctx.input.clientBankAccountId,
        CurrencyAmount: ctx.input.currencyAmount,
        CurrencyExchangeRate: ctx.input.currencyExchangeRate,
        Description: ctx.input.description,
        Comment: ctx.input.comment,
        DueDate: ctx.input.dueDate,
        PaymentDate: ctx.input.paymentDate,
        PaymentOnHold: ctx.input.paymentOnHold,
        Payout: ctx.input.payout,
        PurchaseOrderReference: ctx.input.purchaseOrderReference,
        ProjectId: ctx.input.projectId,
        DepartmentId: ctx.input.departmentId,
        LocationId: ctx.input.locationId,
        Dim1Id: ctx.input.dim1Id,
        Dim2Id: ctx.input.dim2Id,
        Dim3Id: ctx.input.dim3Id,
        SupplierVoucherLines: ctx.input.lines?.map(buildSupplierVoucherLine)
      })
    );

    return {
      output: {
        voucher: mapSupplierInvoiceVoucher(voucher)
      },
      message: `Created PowerOffice supplier invoice voucher draft **${stringValue(voucher, 'Id') ?? ctx.input.invoiceNo}**.`
    };
  })
  .build();

export let powerofficeUploadJournalEntryVoucherPage = SlateTool.create(spec, {
  name: 'Upload PowerOffice Journal Entry Voucher Page',
  key: 'poweroffice_upload_journal_entry_voucher_page',
  description:
    'Upload a document page to an existing PowerOffice journal entry voucher draft using multipart form upload.',
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      voucherId: z.string().min(1).describe('PowerOffice journal entry voucher id.'),
      filename: z.string().min(1).describe('Filename to send to PowerOffice.'),
      mimeType: z.string().min(1).describe('MIME type, for example application/pdf.'),
      contentBase64: z.string().min(1).describe('Base64-encoded file content to upload.')
    })
  )
  .output(
    z.object({
      voucherId: z.string().describe('Voucher id.'),
      filename: z.string().describe('Uploaded filename.'),
      mimeType: z.string().describe('Uploaded MIME type.'),
      sizeBytes: z.number().describe('Uploaded byte size.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let upload = await client.uploadJournalEntryVoucherPage({
      voucherId: ctx.input.voucherId,
      filename: ctx.input.filename,
      mimeType: ctx.input.mimeType,
      contentBase64: ctx.input.contentBase64
    });

    return {
      output: {
        voucherId: ctx.input.voucherId,
        filename: upload.filename,
        mimeType: upload.mimeType,
        sizeBytes: upload.sizeBytes
      },
      message: `Uploaded PowerOffice journal entry voucher page **${upload.filename}**.`
    };
  })
  .build();

export let powerofficeSubmitJournalEntryVoucherForApproval = SlateTool.create(spec, {
  name: 'Submit PowerOffice Journal Entry Voucher For Approval',
  key: 'poweroffice_submit_journal_entry_voucher_for_approval',
  description:
    'Submit an existing PowerOffice journal entry voucher draft into the approval workflow.',
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      voucherId: z.string().min(1).describe('PowerOffice journal entry voucher id.'),
      comment: z.string().optional().describe('Approval submission comment.')
    })
  )
  .output(
    z.object({
      status: voucherApprovalStatusSchema.describe('Approval workflow status.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let status = await client.submitJournalEntryVoucherForApproval(ctx.input.voucherId, {
      Comment: ctx.input.comment
    });

    return {
      output: {
        status: mapVoucherApprovalStatus(status)
      },
      message: `Submitted PowerOffice journal entry voucher **${ctx.input.voucherId}** for approval.`
    };
  })
  .build();

export let powerofficeListVoucherApprovalQueue = SlateTool.create(spec, {
  name: 'List PowerOffice Voucher Approval Queue',
  key: 'poweroffice_list_voucher_approval_queue',
  description:
    'List vouchers currently available to the integration for PowerOffice voucher approval handling.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      availableFromDateTimeOffsetGreaterThan: z
        .string()
        .optional()
        .describe('Return vouchers made available after this timestamp.'),
      ...paginationInputSchema
    })
  )
  .output(
    z.object({
      approvals: z.array(voucherApprovalSchema).describe('Voucher approval queue records.'),
      page: paginationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let approvals = await client.listVoucherApprovals(
      buildListParams(ctx.input, {
        availableFromDateTimeOffsetGreaterThan:
          ctx.input.availableFromDateTimeOffsetGreaterThan
      })
    );

    return {
      output: {
        approvals: approvals.map(mapVoucherApproval),
        page: pageSummary(ctx.input, approvals.length)
      },
      message: `Retrieved **${approvals.length}** PowerOffice voucher approval record(s).`
    };
  })
  .build();

export let powerofficeUpdateVoucherApproval = SlateTool.create(spec, {
  name: 'Update PowerOffice Voucher Approval',
  key: 'poweroffice_update_voucher_approval',
  description:
    'Approve or reject a PowerOffice voucher that is available in the voucher approval queue.',
  constraints: ['This changes voucher approval state in PowerOffice.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      voucherId: z.string().min(1).describe('PowerOffice voucher id.'),
      status: z.enum(['Approve', 'Reject']).describe('Voucher approval action.'),
      comment: z.string().min(1).describe('Approval/rejection comment.')
    })
  )
  .output(
    z.object({
      status: voucherApprovalStatusSchema.describe('Updated approval status.')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.status === 'Reject' && ctx.input.comment.trim().length === 0) {
      throw powerOfficeValidationError('comment is required when rejecting a voucher.');
    }

    let client = createClient(ctx);
    let status = await client.updateVoucherApproval(ctx.input.voucherId, {
      VoucherApprovalStatus: ctx.input.status,
      Comment: ctx.input.comment
    });

    return {
      output: {
        status: mapVoucherApprovalStatus(status)
      },
      message: `${ctx.input.status === 'Approve' ? 'Approved' : 'Rejected'} PowerOffice voucher **${ctx.input.voucherId}**.`
    };
  })
  .build();
