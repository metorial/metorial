import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDonation,
  getCampaign,
  listCampaigns,
  listDonations,
  listProducts,
  listProfiles,
  listSubscriptions,
  listUsers,
  managePost,
  manageProfile,
  manageSubscription,
  sendMessage,
  upsertUser
} from './tools';
import {
  donationEvents,
  orderEvents,
  postEvents,
  profileEvents,
  subscriptionEvents,
  userEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listCampaigns,
    getCampaign,
    listProfiles,
    manageProfile,
    listDonations,
    createDonation,
    listSubscriptions,
    manageSubscription,
    listUsers,
    upsertUser,
    listProducts,
    managePost,
    sendMessage
  ],
  triggers: [
    donationEvents,
    subscriptionEvents,
    profileEvents,
    userEvents,
    orderEvents,
    postEvents
  ]
});
