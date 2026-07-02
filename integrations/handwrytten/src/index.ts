import { Slate } from 'slates';
import { spec } from './spec';
import {
  browseCards,
  getCardDetails,
  listCardCategories,
  listGiftCards,
  listHandwritingStyles,
  listInserts,
  listOrders,
  listReturnAddresses,
  manageAddressBook,
  manageBasket,
  manageTemplates,
  sendCard
} from './tools';
import { inboundWebhook, orderStatusChanged } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [inboundWebhook, orderStatusChanged]
});
