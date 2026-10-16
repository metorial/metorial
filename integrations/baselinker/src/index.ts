import { Slate } from 'slates';
import { spec } from './spec';
import {
  addOrderPayment,
  createOrder,
  downloadShippingLabel,
  getCouriers,
  getExternalStorages,
  getInventories,
  getInventoryProducts,
  getOrderJournal,
  getOrderReturnOptions,
  getOrderStatuses,
  getOrders,
  manageCourierShipments,
  manageInventoryProducts,
  manageOrderProducts,
  manageOrderReturns,
  updateInventoryStockPrices,
  updateOrder
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getOrders,
    createOrder,
    downloadShippingLabel,
    getOrderJournal,
    getOrderReturnOptions,
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
  triggers: []
});
