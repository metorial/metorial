import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteResource = SlateTool.create(spec, {
  name: 'Delete Resource',
  key: 'delete_resource',
  description: `Delete a resource from Zoho Inventory by type and ID. Supports deleting items, contacts, sales orders, purchase orders, invoices, bills, credit notes, inventory adjustments, transfer orders, packages, and shipment orders.`,
  constraints: [
    'This action is irreversible. Make sure to confirm the resource type and ID before deleting.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      resourceType: z
        .enum([
          'item',
          'contact',
          'sales_order',
          'purchase_order',
          'invoice',
          'bill',
          'credit_note',
          'inventory_adjustment',
          'transfer_order',
          'package',
          'shipment_order',
          'customer_payment'
        ])
        .describe('Type of resource to delete'),
      resourceId: z.string().describe('ID of the resource to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful'),
      resourceType: z.string().describe('Type of deleted resource'),
      resourceId: z.string().describe('ID of deleted resource')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let { resourceType, resourceId } = ctx.input;

    switch (resourceType) {
      case 'item':
        await client.deleteItem(resourceId);
        break;
      case 'contact':
        await client.deleteContact(resourceId);
        break;
      case 'sales_order':
        await client.deleteSalesOrder(resourceId);
        break;
      case 'purchase_order':
        await client.deletePurchaseOrder(resourceId);
        break;
      case 'invoice':
        await client.deleteInvoice(resourceId);
        break;
      case 'bill':
        await client.deleteBill(resourceId);
        break;
      case 'credit_note':
        await client.deleteCreditNote(resourceId);
        break;
      case 'inventory_adjustment':
        await client.deleteInventoryAdjustment(resourceId);
        break;
      case 'transfer_order':
        await client.deleteTransferOrder(resourceId);
        break;
      case 'package':
        await client.deletePackage(resourceId);
        break;
      case 'shipment_order':
        await client.deleteShipmentOrder(resourceId);
        break;
      case 'customer_payment':
        await client.deleteCustomerPayment(resourceId);
        break;
    }

    return {
      output: {
        deleted: true,
        resourceType,
        resourceId
      },
      message: `Deleted **${resourceType}** with ID ${resourceId}.`
    };
  })
  .build();
