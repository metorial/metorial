import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelOrder,
  createOrder,
  createRecipePage,
  createShoppingListPage,
  createUser,
  findStores,
  getNearbyRetailers,
  getOrder,
  listCartServiceOptions,
  previewServiceOptions,
  reserveServiceOption,
  sandboxAdvanceOrder
} from './tools';
import { deliveryEvents, itemEvents, orderEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createRecipePage,
    createShoppingListPage,
    getNearbyRetailers,
    findStores,
    previewServiceOptions,
    listCartServiceOptions,
    reserveServiceOption,
    createUser,
    createOrder,
    getOrder,
    cancelOrder,
    sandboxAdvanceOrder
  ],
  triggers: [orderEvents, itemEvents, deliveryEvents]
});
