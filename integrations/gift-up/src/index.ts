import { Slate } from 'slates';
import { spec } from './spec';
import {
  createOrder,
  deleteItem,
  deleteItemGroup,
  getCompany,
  getGiftCard,
  getOrder,
  listGiftCards,
  listItemGroups,
  listItems,
  listLocations,
  listTransactions,
  manageItem,
  manageItemGroup,
  reactivateGiftCard,
  redeemGiftCard,
  topUpGiftCard,
  transferBalances,
  undoRedemption,
  updateGiftCard,
  updateOrder,
  voidGiftCard
} from './tools';
import {
  giftCardCreatedTrigger,
  giftCardRedeemedTrigger,
  giftCardUpdatedTrigger,
  orderCreatedTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getGiftCard,
    listGiftCards,
    updateGiftCard,
    redeemGiftCard,
    undoRedemption,
    topUpGiftCard,
    voidGiftCard,
    reactivateGiftCard,
    transferBalances,
    createOrder,
    getOrder,
    updateOrder,
    manageItem,
    listItems,
    deleteItem,
    manageItemGroup,
    listItemGroups,
    deleteItemGroup,
    listTransactions,
    getCompany,
    listLocations
  ],
  triggers: [
    orderCreatedTrigger,
    giftCardCreatedTrigger,
    giftCardRedeemedTrigger,
    giftCardUpdatedTrigger
  ]
});
