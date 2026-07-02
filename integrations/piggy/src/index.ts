import { Slate } from 'slates';
import { spec } from './spec';
import {
  awardCredits,
  claimReward,
  createContact,
  deleteContact,
  getContact,
  getLoyaltyProgram,
  listContacts,
  listLoyaltyTransactions,
  listPromotions,
  listRewards,
  listShops,
  manageContactIdentifiers,
  manageGiftcards,
  managePrepaid,
  manageVouchers,
  triggerAutomation,
  updateContact
} from './tools';
import {
  contactEvents,
  engagementEvents,
  financialEvents,
  loyaltyEvents,
  voucherEvents
} from './triggers';

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
  triggers: [contactEvents, loyaltyEvents, financialEvents, voucherEvents, engagementEvents]
});
