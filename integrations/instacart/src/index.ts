import { Slate } from 'slates';
import { toolCategories } from './categories';
import { spec } from './spec';
import {
  cancelOrder,
  createOrder,
  createRecipePage,
  createShoppingListPage,
  createUser,
  findStores,
  getConnectUser,
  getNearbyRetailers,
  getOrder,
  listCartServiceOptions,
  previewServiceOptions,
  reserveServiceOption,
  reserveTimeSlot,
  sandboxAdvanceOrder
} from './tools';
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
    getConnectUser,
    reserveTimeSlot,
    cancelOrder,
    sandboxAdvanceOrder
  ],
  toolCategories,
  triggers: []
});
