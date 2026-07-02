import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDeliveryOrder,
  deleteDeliveryOrder,
  getDeliveryOrders,
  manageCarriers,
  managePickupOrder,
  onDemandDelivery,
  trackDelivery,
  updateDeliveryOrder
} from './tools';
import { orderStatusUpdate } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createDeliveryOrder,
    getDeliveryOrders,
    updateDeliveryOrder,
    deleteDeliveryOrder,
    managePickupOrder,
    manageCarriers,
    trackDelivery,
    onDemandDelivery
  ],
  triggers: [orderStatusUpdate]
});
