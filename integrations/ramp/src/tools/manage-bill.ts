import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import {
  date,
  invalid,
  nonemptyPatch,
  object,
  recordSchema,
  required,
  unsupported
} from '../lib/validation';
import { spec } from '../spec';

let lineItemSchema = z.object({
  amount: z
    .number()
    .describe(
      'Amount in the Bills API line-item format. The supplied numeric value is forwarded without denomination conversion.'
    ),
  currencyCode: z.string().optional().describe('Currency code (e.g. USD)'),
  description: z.string().optional().describe('Line item description'),
  accountingFieldSelections: z
    .array(
      z.object({
        fieldId: z
          .string()
          .optional()
          .describe(
            'Deprecated internal field selector; use fieldExternalId for the current API.'
          ),
        fieldOptionId: z
          .string()
          .optional()
          .describe(
            'Deprecated internal option selector; use fieldOptionExternalId for the current API.'
          ),
        fieldExternalId: z
          .string()
          .optional()
          .describe('Exact external accounting field ID accepted by the Bills API.'),
        fieldOptionExternalId: z
          .string()
          .optional()
          .describe('Exact external accounting field option ID.')
      })
    )
    .optional()
    .describe('Accounting field selections for the line item')
});

export let manageBill = SlateTool.create(spec, {
  name: 'Manage Bill',
  key: 'manage_bill',
  description: `Create, update, retrieve, or archive a Ramp bill (accounts payable).
- **get**: Retrieve a specific bill by ID.
- **create**: Create a new bill with vendor, invoice currency, issue/due dates and line items. Bills created via API are automatically approved.
- **update**: Modify an approved bill's fields.
- **archive**: Archive/delete a bill.`,
  instructions: [
    'Bill line-item amount values are forwarded exactly. Confirm the documented denomination before using a financial fixture.',
    'Bills created via API are automatically approved and skip the draft phase'
  ]
})
  .input(
    z.object({
      action: z.enum(['get', 'create', 'update', 'archive']).describe('Action to perform'),
      billId: z.string().optional().describe('Bill ID (required for get, update, archive)'),
      vendorId: z.string().optional().describe('Vendor ID (required for create)'),
      invoiceNumber: z.string().optional().describe('Invoice number'),
      invoiceCurrency: z.string().optional().describe('Invoice currency code (e.g. USD)'),
      amount: z
        .number()
        .optional()
        .describe(
          'Deprecated aggregate amount. The current API derives the total from lineItems; omit this field.'
        ),
      dueDate: z.string().optional().describe('Due date (ISO 8601 format)'),
      issueDate: z.string().optional().describe('Issue date (ISO 8601 format)'),
      memo: z.string().optional().describe('Memo or notes'),
      lineItems: z.array(lineItemSchema).optional().describe('Bill line items'),
      paymentMethod: z
        .string()
        .optional()
        .describe('Payment method; creating an approved bill may initiate payment.'),
      entityId: z
        .string()
        .optional()
        .describe(
          'Bill entity. If omitted on creation, a nonnull default_entity_id is read from the chosen vendor; otherwise supply this explicitly.'
        ),
      vendorContactId: z
        .string()
        .optional()
        .describe('Vendor contact required on creation unless useDefaultVendorContact=true.'),
      useDefaultVendorContact: z
        .boolean()
        .optional()
        .describe('Use the provider-configured default contact on creation.'),
      useDefaultPaymentMethod: z
        .boolean()
        .optional()
        .describe(
          "Use the vendor's provider-configured default payment method on creation; cannot be combined with paymentMethod or paymentDetails."
        ),
      paymentDetails: z
        .object({
          paymentArrivalDate: z.string().optional(),
          sourceBankAccountId: z.string().optional(),
          vendorAccountId: z.string().optional(),
          spendLimitId: z.string().optional(),
          transactionId: z.string().optional(),
          manualPaymentMethod: z.string().optional(),
          paymentDate: z.string().optional(),
          isSameDay: z
            .boolean()
            .optional()
            .describe(
              'Same-day delivery is available only for enabled ACH accounts and may incur a fee.'
            )
        })
        .optional()
        .describe(
          'Documented payment-method-specific details. Must match paymentMethod; payment and notification effects require deliberate authorization.'
        )
    })
  )
  .output(
    z.object({
      bill: recordSchema.describe('Bill object from the API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);
    let input = ctx.input;
    if (input.action === 'get')
      return {
        output: { bill: await client.getBill(required(input.billId, 'billId')) },
        message: 'Retrieved the bill.'
      };
    if (input.action === 'archive') {
      let bill = await client.archiveBill(required(input.billId, 'billId'));
      return {
        output: { bill },
        message:
          'Ramp acknowledged archiving. This may cancel payments or terminate an attached one-time card; verify the archived state.'
      };
    }
    if (input.amount !== undefined)
      throw invalid(
        'The current Bills API does not accept aggregate amount. Omit amount and provide lineItems; Ramp derives the total from them.'
      );
    let creating = input.action === 'create';
    if (!creating)
      unsupported(
        input,
        [
          'invoiceCurrency',
          'paymentDetails',
          'useDefaultPaymentMethod',
          'useDefaultVendorContact'
        ],
        'Approved bill update'
      );
    let body: Record<string, unknown> = {};
    for (let [field, key] of [
      ['vendorId', 'vendor_id'],
      ['invoiceNumber', 'invoice_number'],
      ['memo', 'memo'],
      ['paymentMethod', 'payment_method'],
      ['entityId', 'entity_id'],
      ['vendorContactId', 'vendor_contact_id']
    ] as const)
      if (input[field] !== undefined) body[key] = input[field];
    if (input.dueDate !== undefined) body.due_at = date(input.dueDate, 'dueDate', true);
    if (input.issueDate !== undefined)
      body.issued_at = date(input.issueDate, 'issueDate', true);
    if (creating) {
      required(input.vendorId, 'vendorId');
      required(input.invoiceNumber, 'invoiceNumber');
      required(input.invoiceCurrency, 'invoiceCurrency');
      required(input.dueDate, 'dueDate');
      required(input.issueDate, 'issueDate');
      let entity = input.entityId;
      if (entity === undefined) {
        let vendor = await client.getVendor(required(input.vendorId, 'vendorId'));
        if (typeof vendor.default_entity_id === 'string' && vendor.default_entity_id)
          entity = vendor.default_entity_id;
      }
      body.entity_id = required(entity, 'entityId (the vendor has no usable default entity)');
      body.invoice_currency = input.invoiceCurrency;
      if (input.useDefaultPaymentMethod === true) {
        unsupported(
          input,
          ['paymentMethod', 'paymentDetails'],
          'Default payment method selection'
        );
        body.use_default_payment_method = true;
      } else {
        let method = required(
          input.paymentMethod,
          'paymentMethod or useDefaultPaymentMethod=true'
        );
        if (
          ![
            'ACH',
            'CARD',
            'CHECK',
            'CRYPTO_WALLET_TRANSFER',
            'DOMESTIC_WIRE',
            'INTERNATIONAL',
            'LOCAL_BANK_TRANSFER',
            'ONE_TIME_CARD',
            'ONE_TIME_CARD_DELIVERY',
            'PAID_MANUALLY',
            'SWIFT'
          ].includes(method)
        )
          throw invalid(
            'paymentMethod must be a method documented for approved bill creation.'
          );
        let details = input.paymentDetails;
        if (details) {
          if (details.isSameDay === true && method !== 'ACH')
            throw invalid('Same-day bill delivery is supported only for ACH payments.');
          if (['ONE_TIME_CARD', 'ONE_TIME_CARD_DELIVERY'].includes(method))
            throw invalid(
              'One-time-card bill methods do not accept paymentDetails. Omit that object.'
            );
          let value: Record<string, unknown> = {};
          for (let [field, key] of [
            ['sourceBankAccountId', 'source_bank_account_id'],
            ['vendorAccountId', 'vendor_account_id'],
            ['spendLimitId', 'spend_limit_id'],
            ['transactionId', 'transaction_id'],
            ['manualPaymentMethod', 'manual_payment_method'],
            ['isSameDay', 'is_same_day']
          ] as const)
            if (details[field] !== undefined) value[key] = details[field];
          if (details.paymentArrivalDate !== undefined)
            value.payment_arrival_date = date(
              details.paymentArrivalDate,
              'paymentArrivalDate',
              true
            );
          if (details.paymentDate !== undefined)
            value.payment_date = date(details.paymentDate, 'paymentDate', true);
          if (method === 'CARD') {
            required(details.spendLimitId, 'paymentDetails.spendLimitId');
            unsupported(
              details,
              [
                'sourceBankAccountId',
                'vendorAccountId',
                'paymentArrivalDate',
                'manualPaymentMethod',
                'paymentDate',
                'isSameDay'
              ],
              'Card payment details'
            );
          } else if (method === 'PAID_MANUALLY') {
            required(details.manualPaymentMethod, 'paymentDetails.manualPaymentMethod');
            if (
              ![
                'CASH',
                'CHECK',
                'CROSS_BORDER_PAYMENT',
                'CRYPTO_WALLET_TRANSFER',
                'DIRECT_DEBIT',
                'DOMESTIC_WIRE_TRANSFER',
                'NON_RAMP_CREDIT_CARD',
                'OTHER',
                'PAID_IN_ERP'
              ].includes(required(details.manualPaymentMethod, 'manualPaymentMethod'))
            )
              throw invalid('manualPaymentMethod must be a documented manual payment method.');
            required(details.paymentDate, 'paymentDetails.paymentDate');
            unsupported(
              details,
              [
                'sourceBankAccountId',
                'vendorAccountId',
                'spendLimitId',
                'transactionId',
                'paymentArrivalDate',
                'isSameDay'
              ],
              'Manual payment details'
            );
          } else if (method === 'CHECK') {
            required(details.sourceBankAccountId, 'paymentDetails.sourceBankAccountId');
            required(details.paymentArrivalDate, 'paymentDetails.paymentArrivalDate');
            unsupported(
              details,
              [
                'vendorAccountId',
                'spendLimitId',
                'transactionId',
                'manualPaymentMethod',
                'paymentDate'
              ],
              'Check payment details'
            );
          } else {
            required(details.sourceBankAccountId, 'paymentDetails.sourceBankAccountId');
            required(details.vendorAccountId, 'paymentDetails.vendorAccountId');
            required(details.paymentArrivalDate, 'paymentDetails.paymentArrivalDate');
            unsupported(
              details,
              ['spendLimitId', 'transactionId', 'manualPaymentMethod', 'paymentDate'],
              'Vendor account payment details'
            );
          }
          body.payment_details = value;
        } else if (!['ONE_TIME_CARD', 'ONE_TIME_CARD_DELIVERY'].includes(method))
          throw invalid(
            'Provide documented paymentDetails for paymentMethod, or explicitly choose useDefaultPaymentMethod=true.'
          );
      }
      if (input.useDefaultVendorContact === true) {
        unsupported(input, ['vendorContactId'], 'Default vendor contact selection');
        body.use_default_vendor_contact = true;
      } else
        required(input.vendorContactId, 'vendorContactId or useDefaultVendorContact=true');
    }
    if (input.lineItems !== undefined) {
      let currency = input.invoiceCurrency;
      if (!creating && input.lineItems.some(item => item.currencyCode !== undefined)) {
        let old = await client.getBill(required(input.billId, 'billId'));
        let money = object(old.amount, 'bill amount');
        if (typeof money.currency_code !== 'string')
          throw invalid(
            'Cannot verify line currency against the existing bill. Omit line-level currencyCode; it cannot change the bill currency.'
          );
        currency = money.currency_code;
      }
      body.line_items = input.lineItems.map(item => {
        if (item.currencyCode !== undefined && item.currencyCode !== currency)
          throw invalid(
            'Each line currencyCode must match the bill invoice currency; it is validated rather than sent as an unsupported line field.'
          );
        let line: Record<string, unknown> = { amount: item.amount };
        if (item.description !== undefined) line.memo = item.description;
        if (item.accountingFieldSelections !== undefined)
          line.accounting_field_selections = item.accountingFieldSelections.map(selection => {
            unsupported(
              selection,
              ['fieldId', 'fieldOptionId'],
              'Current bill accounting selection'
            );
            return {
              field_external_id: required(selection.fieldExternalId, 'fieldExternalId'),
              field_option_external_id:
                selection.fieldOptionExternalId === undefined
                  ? undefined
                  : required(selection.fieldOptionExternalId, 'fieldOptionExternalId')
            };
          });
        return line;
      });
    }
    if (input.invoiceNumber !== undefined && input.invoiceNumber.length > 84)
      throw invalid('invoiceNumber must not exceed 84 characters.');
    if (input.memo !== undefined && input.memo.length > 1000)
      throw invalid('memo must not exceed 1000 characters.');
    nonemptyPatch(body);
    let bill = creating
      ? await client.createBill(body)
      : await client.updateBill(required(input.billId, 'billId'), body);
    return {
      output: { bill },
      message: creating
        ? 'Ramp returned an automatically approved bill. Check its payment state; creation may initiate payment.'
        : 'Ramp returned the updated bill. Supplied lineItems replace its complete line-item list.'
    };
  })
  .build();
