import { deleteResource } from './tools/delete-resource';
import { getItem } from './tools/get-item';
import { getSalesOrder } from './tools/get-sales-order';
import { listContacts } from './tools/list-contacts';
import { listInvoices } from './tools/list-invoices';
import { listItems } from './tools/list-items';
import { listLocations } from './tools/list-locations';
import { listPurchaseOrders } from './tools/list-purchase-orders';
import { listSalesOrders } from './tools/list-sales-orders';
import { listWarehouses } from './tools/list-warehouses';
import { manageBill } from './tools/manage-bill';
import { manageContact } from './tools/manage-contact';
import { manageCreditNote } from './tools/manage-credit-note';
import { manageInvoice } from './tools/manage-invoice';
import { manageItem } from './tools/manage-item';
import { managePackageShipment } from './tools/manage-package-shipment';
import { managePurchaseOrder } from './tools/manage-purchase-order';
import { manageSalesOrder } from './tools/manage-sales-order';
import { manageTransferOrder } from './tools/manage-transfer-order';
import { recordCustomerPayment } from './tools/record-customer-payment';
import { recordInventoryAdjustment } from './tools/record-inventory-adjustment';

export const inventoryTools = [
  listLocations,
  manageCreditNote,
  manageTransferOrder,
  listSalesOrders,
  recordCustomerPayment,
  manageContact,
  deleteResource,
  manageInvoice,
  listItems,
  manageItem,
  listContacts,
  recordInventoryAdjustment,
  managePurchaseOrder,
  manageBill,
  listInvoices,
  manageSalesOrder,
  managePackageShipment,
  listWarehouses,
  getSalesOrder,
  getItem,
  listPurchaseOrders
];
