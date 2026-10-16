import { Slate } from 'slates';
import { spec } from './spec';
import {
  browseCards,
  cancelOrder,
  getCardDetails,
  getCurrentUser,
  getOrder,
  listCardCategories,
  listCountries,
  listGiftCards,
  listHandwritingStyles,
  listInserts,
  listOrders,
  listReturnAddresses,
  listStates,
  manageAddressBook,
  manageBasket,
  manageReturnAddresses,
  manageTemplates,
  sendCard
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    getOrder,
    cancelOrder,
    listCountries,
    listStates,
    manageReturnAddresses,
    sendCard,
    browseCards,
    getCardDetails,
    listCardCategories,
    listHandwritingStyles,
    manageAddressBook,
    manageTemplates,
    manageBasket,
    listOrders,
    listGiftCards,
    listInserts,
    listReturnAddresses
  ],
  triggers: []
});
