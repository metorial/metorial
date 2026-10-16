import { Slate } from 'slates';
import { spec } from './spec';
import {
  awardCredits,
  calculateCredits,
  claimReward,
  createContact,
  deleteContact,
  getContact,
  getLoyaltyProgram,
  listContactAttributes,
  listContacts,
  listGiftcardTransactions,
  listLoyaltyTransactions,
  listPromotions,
  listRewards,
  listShops,
  manageContactIdentifiers,
  manageGiftcards,
  managePrepaid,
  manageVouchers,
  reverseTransaction,
  triggerAutomation,
  updateContact
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listContacts,
    getContact,
    createContact,
    updateContact,
    deleteContact,
    manageContactIdentifiers,
    awardCredits,
    calculateCredits,
    reverseTransaction,
    listContactAttributes,
    listGiftcardTransactions,
    listLoyaltyTransactions,
    listRewards,
    claimReward,
    manageVouchers,
    manageGiftcards,
    managePrepaid,
    listShops,
    listPromotions,
    getLoyaltyProgram,
    triggerAutomation
  ],
  triggers: []
});
