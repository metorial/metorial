import { Slate } from 'slates';
import { spec } from './spec';
import {
  addOrderPayment,
  createOrder,
  getCouriers,
  getExternalStorages,
  getInventories,
  getInventoryProducts,
  getOrderStatuses,
  getOrders,
  manageCourierShipments,
  manageInventoryProducts,
  manageOrderProducts,
  manageOrderReturns,
  updateInventoryStockPrices,
  updateOrder
} from './tools';
import { inboundWebhook, orderEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getOrders,
    createOrder,
    updateOrder,
    manageOrderProducts,
    addOrderPayment,
    getOrderStatuses,
    getInventories,
    getInventoryProducts,
    manageInventoryProducts,
    updateInventoryStockPrices,
    manageCourierShipments,
    getCouriers,
    manageOrderReturns,
    getExternalStorages
  ],
  triggers: [inboundWebhook, orderEvents]
});
