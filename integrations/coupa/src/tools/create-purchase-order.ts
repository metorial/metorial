import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoupaClient } from '../lib/client';
import { customFields, decimal, requireValue } from '../lib/contracts';
import { spec } from '../spec';

let orderLineInputSchema = z
  .object({
    description: z.string().describe('Description of the line item'),
    lineNumber: z.number().optional().describe('Line number'),
    quantity: z.number().optional().describe('Quantity to order'),
    quantityDecimal: z
      .string()
      .optional()
      .describe('Exact plain decimal quantity; omit the numeric alias for high precision'),
    price: z.number().optional().describe('Unit price'),
    priceDecimal: z
      .string()
      .optional()
      .describe('Exact plain decimal price; omit the numeric alias for high precision'),
    currency: z.object({ code: z.string() }).optional().describe('Currency for this line'),
    needByDate: z.string().optional().describe('Need-by date (ISO 8601)'),
    accountingTotal: z.number().optional().describe('Total accounting amount'),
    uom: z.object({ code: z.string() }).optional().describe('Unit of measure'),
    commodity: z.object({ name: z.string() }).optional().describe('Commodity'),
    account: z.any().optional().describe('Account object for this line')
  })
  .describe('Order line item');

export let createPurchaseOrder = SlateTool.create(spec, {
  name: 'Create Purchase Order',
  key: 'create_purchase_order',
  description: `Create an external purchase order in Coupa with header information and order lines. Native external-order support and a ship-to user are required; this does not create Coupa-generated purchase orders. Requires a supplier and at least one order line with description, quantity, and price.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      shipToUserId: z
        .number()
        .optional()
        .describe('Required native ship-to user for an external purchase order'),
      supplier: z
        .object({
          supplierId: z.number().optional().describe('Supplier ID'),
          supplierNumber: z.string().optional().describe('Supplier number')
        })
        .describe('Supplier reference — provide either supplierId or supplierNumber'),
      shipToAddress: z
        .object({
          addressId: z.number().optional().describe('Address ID')
        })
        .optional()
        .describe('Ship-to address reference'),
      currency: z
        .object({
          code: z.string()
        })
        .optional()
        .describe('Currency for the PO'),
      paymentTermCode: z.string().optional().describe('Payment term code'),
      poNumber: z.string().optional().describe('Custom PO number (if not auto-generated)'),
      orderLines: z
        .array(orderLineInputSchema)
        .min(1)
        .describe('Order lines (at least one required)'),
      customFieldsGlobalNamespace: z
        .boolean()
        .optional()
        .describe(
          'Use true for existing global custom fields (legacy default); false places fields under the modern custom-fields namespace'
        ),
      customFields: z.record(z.string(), z.any()).optional().describe('Custom field values')
    })
  )
  .output(
    z.object({
      purchaseOrderId: z.number().describe('Created PO ID'),
      poNumber: z.string().nullable().optional().describe('PO number'),
      status: z.string().nullable().optional().describe('PO status after creation'),
      rawData: z
        .any()
        .optional()
        .describe('Native data with documented credential fields omitted')
    })
  )
  .handleInvocation(async ctx => {
    let client = CoupaClient.from(ctx);

    requireValue(
      ctx.input.shipToUserId !== undefined,
      'Coupa creation supports external purchase orders and requires shipToUserId. Use requisitions for Coupa-generated purchase orders.'
    );
    requireValue(
      Boolean(ctx.input.supplier.supplierId) !== Boolean(ctx.input.supplier.supplierNumber),
      'Provide exactly one supplier ID or supplier number.'
    );
    requireValue(
      !ctx.input.shipToAddress || ctx.input.shipToAddress.addressId !== undefined,
      'Provide the ship-to address ID or omit the address.'
    );
    let supplierRef: any = {};
    if (ctx.input.supplier.supplierId) {
      supplierRef.id = ctx.input.supplier.supplierId;
    } else if (ctx.input.supplier.supplierNumber) {
      supplierRef.number = ctx.input.supplier.supplierNumber;
    }

    let payload: any = {
      type: 'ExternalOrderHeader',
      'ship-to-user': { id: ctx.input.shipToUserId },
      supplier: supplierRef,
      'order-lines': ctx.input.orderLines.map((line, idx) => {
        let ol: any = {
          description: line.description,
          'line-num': line.lineNumber ?? idx + 1,
          quantity: decimal(line.quantity, line.quantityDecimal, 'quantity'),
          price: decimal(line.price, line.priceDecimal, 'price')
        };
        if (line.accountingTotal !== undefined)
          ol['accounting-total'] = decimal(
            line.accountingTotal,
            undefined,
            'accounting total',
            32,
            4
          );
        if (line.currency) ol.currency = line.currency;
        if (line.needByDate) ol['need-by-date'] = line.needByDate;
        if (line.uom) ol.uom = line.uom;
        if (line.commodity) ol.commodity = line.commodity;
        if (line.account) ol.account = line.account;
        return ol;
      })
    };

    if (ctx.input.shipToAddress)
      payload['ship-to-address'] = { id: ctx.input.shipToAddress.addressId };
    if (ctx.input.currency) payload.currency = ctx.input.currency;
    if (ctx.input.paymentTermCode)
      payload['payment-term'] = { code: ctx.input.paymentTermCode };
    if (ctx.input.poNumber) payload['po-number'] = ctx.input.poNumber;
    customFields(
      payload,
      ctx.input.customFields,
      ctx.input.customFieldsGlobalNamespace ?? true
    );

    let result = await client.createPurchaseOrder(payload);

    return {
      output: {
        purchaseOrderId: result.id,
        poNumber: result['po-number'] ?? result.po_number ?? null,
        status: result.status ?? null,
        rawData: result
      },
      message: `Created purchase order **#${result['po-number'] ?? result.po_number ?? result.id}** (status: ${result.status}).`
    };
  })
  .build();
