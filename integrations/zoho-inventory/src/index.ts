import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteResource,
  getItem,
  getSalesOrder,
  listContacts,
  listInvoices,
  listItems,
  listPurchaseOrders,
  listSalesOrders,
  listWarehouses,
  manageBill,
  manageContact,
  manageCreditNote,
  manageInvoice,
  manageItem,
  managePackageShipment,
  managePurchaseOrder,
  manageSalesOrder,
  manageTransferOrder,
  recordCustomerPayment,
  recordInventoryAdjustment
} from './tools';
import {
  contactChanges,
  inboundWebhook,
  invoiceChanges,
  itemChanges,
  purchaseOrderChanges,
  salesOrderChanges
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    manageItem,
    getItem,
    listItems,
    manageContact,
    listContacts,
    manageSalesOrder,
    getSalesOrder,
    listSalesOrders,
    manageInvoice,
    listInvoices,
    managePurchaseOrder,
    listPurchaseOrders,
    manageBill,
    managePackageShipment,
    manageCreditNote,
    recordCustomerPayment,
    recordInventoryAdjustment,
    manageTransferOrder,
    listWarehouses,
    deleteResource
  ],
  triggers: [
    inboundWebhook,
    itemChanges,
    salesOrderChanges,
    invoiceChanges,
    purchaseOrderChanges,
    contactChanges
  ]
});
