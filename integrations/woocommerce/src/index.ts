import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCustomer,
  createOrder,
  createProduct,
  createRefund,
  deleteProduct,
  getCustomer,
  getOrder,
  getProduct,
  getSalesReport,
  getStoreSettings,
  getSystemStatus,
  listCustomers,
  listOrders,
  listProducts,
  manageCoupons,
  manageOrderNotes,
  managePaymentGateways,
  manageProductCategories,
  manageProductVariations,
  manageShippingZones,
  manageTaxRates,
  updateCustomer,
  updateOrder,
  updateProduct,
  updateStoreSetting
} from './tools';
import { couponEvents, customerEvents, orderEvents, productEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    manageProductVariations,
    manageProductCategories,
    listOrders,
    getOrder,
    createOrder,
    updateOrder,
    manageOrderNotes,
    createRefund,
    listCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    manageCoupons,
    getSalesReport,
    manageShippingZones,
    manageTaxRates,
    getStoreSettings,
    updateStoreSetting,
    managePaymentGateways,
    getSystemStatus
  ],
  triggers: [orderEvents, productEvents, customerEvents, couponEvents]
});
