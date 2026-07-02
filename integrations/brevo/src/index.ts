import { Slate } from 'slates';
import { spec } from './spec';
import {
  addContactsToList,
  createContactList,
  createDeal,
  createEmailCampaign,
  createOrUpdateContact,
  deleteContact,
  deleteDeal,
  getAccount,
  getContact,
  getDeal,
  getEmailCampaign,
  listContactLists,
  listContacts,
  listDeals,
  listEmailCampaigns,
  listSenders,
  removeContactsFromList,
  sendEmailCampaignNow,
  sendTransactionalEmail,
  sendTransactionalSms,
  trackEvent,
  updateContact,
  updateDeal
} from './tools';
import {
  inboundEmailEvents,
  marketingEvents,
  transactionalEmailEvents,
  transactionalSmsEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    sendTransactionalEmail.build(),
    sendTransactionalSms.build(),
    createOrUpdateContact.build(),
    getContact.build(),
    updateContact.build(),
    deleteContact.build(),
    listContacts.build(),
    listContactLists.build(),
    createContactList.build(),
    addContactsToList.build(),
    removeContactsFromList.build(),
    createDeal.build(),
    getDeal.build(),
    updateDeal.build(),
    deleteDeal.build(),
    listDeals.build(),
    createEmailCampaign.build(),
    getEmailCampaign.build(),
    listEmailCampaigns.build(),
    sendEmailCampaignNow.build(),
    getAccount.build(),
    listSenders.build(),
    trackEvent.build()
  ],
  triggers: [
    transactionalEmailEvents.build(),
    transactionalSmsEvents.build(),
    marketingEvents.build(),
    inboundEmailEvents.build()
  ]
});
