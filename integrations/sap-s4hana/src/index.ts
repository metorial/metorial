import { Slate } from 'slates';
import { spec } from './spec';
import {
  getBillingDocument,
  getBusinessPartner,
  getProduct,
  getPurchaseOrder,
  getSalesOrder,
  getSupplierInvoice,
  listBillingDocuments,
  listBusinessPartners,
  listProducts,
  listPurchaseOrders,
  listSalesOrders,
  listSupplierInvoices
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    listBusinessPartners,
    getBusinessPartner,
    listSalesOrders,
    getSalesOrder,
    listBillingDocuments,
    getBillingDocument,
    listProducts,
    getProduct,
    listPurchaseOrders,
    getPurchaseOrder,
    listSupplierInvoices,
    getSupplierInvoice
  ],
  triggers: []
});
