import { toolCategory } from 'slates';
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

export let toolCategories = [
  toolCategory({
    key: 'developer_platform',
    name: 'Instacart Developer Platform',
    description:
      'Shoppable recipe and shopping-list pages and nearby retailers. Uses a Developer Platform API key.',
    tools: [createRecipePage, createShoppingListPage, getNearbyRetailers]
  }),
  toolCategory({
    key: 'connect',
    name: 'Instacart Connect',
    description:
      'Retailer fulfillment customers, stores, time slots, orders, and sandbox workflows. Uses Connect client credentials.',
    tools: [
      findStores,
      previewServiceOptions,
      listCartServiceOptions,
      reserveServiceOption,
      reserveTimeSlot,
      createUser,
      getConnectUser,
      createOrder,
      getOrder,
      cancelOrder,
      sandboxAdvanceOrder
    ]
  })
];
