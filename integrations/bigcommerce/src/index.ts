import { Slate } from 'slates';
import { spec } from './spec';
import {
  createProduct,
  deleteProduct,
  getOrder,
  getProduct,
  getStoreInformation,
  listChannels,
  listCustomers,
  listOrders,
  listProducts,
  manageBrand,
  manageCart,
  manageCategory,
  manageCoupon,
  manageCustomer,
  manageOrderShipment,
  managePage,
  managePriceList,
  manageSubscriber,
  updateOrder,
  updateProduct
} from './tools';
import {
  cartEvents,
  customerEvents,
  inventoryEvents,
  orderEvents,
  productEvents,
  shipmentEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    listOrders,
    getOrder,
    updateOrder,
    manageOrderShipment,
    listCustomers,
    manageCustomer,
    manageCart,
    manageCategory,
    manageBrand,
    manageCoupon,
    managePage,
    getStoreInformation,
    manageSubscriber,
    listChannels,
    managePriceList
  ],
  triggers: [
    orderEvents,
    productEvents,
    customerEvents,
    cartEvents,
    shipmentEvents,
    inventoryEvents
  ]
});
