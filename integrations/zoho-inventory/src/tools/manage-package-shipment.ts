import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let packageLineSchema = z.object({
  lineItemId: z.string().describe('Sales order line item ID'),
  quantity: z.number().describe('Quantity to pack')
});

export let managePackageShipment = SlateTool.create(spec, {
  name: 'Manage Package & Shipment',
  key: 'manage_package_shipment',
  description: `Create a package (packing slip) for a sales order and optionally create an associated shipment order with tracking details. Also supports marking an existing shipment as delivered.`,
  instructions: [
    'To create a package, provide salesOrderId and packageLineItems.',
    'To also create a shipment, include shipment details (deliveryMethod, trackingNumber, etc.).',
    'To mark a shipment as delivered, provide shipmentOrderId and set markDelivered to true.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      salesOrderId: z.string().optional().describe('Sales order ID to create a package for'),
      packageLineItems: z
        .array(packageLineSchema)
        .optional()
        .describe('Line items to include in the package'),
      packageDate: z.string().optional().describe('Package date (YYYY-MM-DD)'),
      packageNumber: z.string().optional().describe('Custom package number'),
      notes: z.string().optional().describe('Package notes'),

      createShipment: z
        .boolean()
        .optional()
        .describe('Whether to also create a shipment for this package'),
      deliveryMethod: z.string().optional().describe('Delivery method (e.g., "FedEx", "UPS")'),
      trackingNumber: z.string().optional().describe('Shipment tracking number'),
      shippingDate: z.string().optional().describe('Shipping date (YYYY-MM-DD)'),
      shippingCharge: z.number().optional().describe('Shipping charge amount'),

      shipmentOrderId: z.string().optional().describe('Existing shipment order ID'),
      markDelivered: z.boolean().optional().describe('Mark an existing shipment as delivered')
    })
  )
  .output(
    z.object({
      packageId: z.string().optional().describe('Package ID'),
      packageNumber: z.string().optional().describe('Package number'),
      shipmentOrderId: z.string().optional().describe('Shipment order ID'),
      shipmentStatus: z.string().optional().describe('Shipment status'),
      trackingNumber: z.string().optional().describe('Tracking number')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.shipmentOrderId && ctx.input.markDelivered) {
      await client.markShipmentDelivered(ctx.input.shipmentOrderId);
      let result = await client.getShipmentOrder(ctx.input.shipmentOrderId);
      let shipment = result.shipmentorder || result.shipment_order || {};
      return {
        output: {
          shipmentOrderId: String(ctx.input.shipmentOrderId),
          shipmentStatus: shipment.status ?? 'delivered',
          trackingNumber: shipment.tracking_number ?? undefined
        },
        message: `Shipment **${ctx.input.shipmentOrderId}** marked as delivered.`
      };
    }

    let packageResult: any;
    let shipmentResult: any;

    if (ctx.input.salesOrderId && ctx.input.packageLineItems) {
      let packageBody: Record<string, any> = {
        line_items: ctx.input.packageLineItems.map(li => ({
          so_line_item_id: li.lineItemId,
          quantity: li.quantity
        }))
      };
      if (ctx.input.packageDate) packageBody.date = ctx.input.packageDate;
      if (ctx.input.packageNumber) packageBody.package_number = ctx.input.packageNumber;
      if (ctx.input.notes) packageBody.notes = ctx.input.notes;

      packageResult = await client.createPackage(ctx.input.salesOrderId, packageBody);

      if (ctx.input.createShipment && packageResult.package) {
        let shipBody: Record<string, any> = {
          salesorder_id: ctx.input.salesOrderId,
          package_ids: [packageResult.package.package_id]
        };
        if (ctx.input.deliveryMethod) shipBody.delivery_method = ctx.input.deliveryMethod;
        if (ctx.input.trackingNumber) shipBody.tracking_number = ctx.input.trackingNumber;
        if (ctx.input.shippingDate) shipBody.date = ctx.input.shippingDate;
        if (ctx.input.shippingCharge) shipBody.shipping_charge = ctx.input.shippingCharge;

        shipmentResult = await client.createShipmentOrder(shipBody);
      }
    }

    let pkg = packageResult?.package;
    let shipment = shipmentResult?.shipmentorder || shipmentResult?.shipment_order;

    return {
      output: {
        packageId: pkg ? String(pkg.package_id) : undefined,
        packageNumber: pkg?.package_number ?? undefined,
        shipmentOrderId: shipment
          ? String(shipment.shipment_id || shipment.shipmentorder_id)
          : undefined,
        shipmentStatus: shipment?.status ?? undefined,
        trackingNumber: shipment?.tracking_number ?? ctx.input.trackingNumber ?? undefined
      },
      message: pkg
        ? `Package **${pkg.package_number}** created${shipment ? ' with shipment' : ''}.`
        : 'Operation completed.'
    };
  })
  .build();
