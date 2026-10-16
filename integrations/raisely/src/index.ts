import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDonation,
  getCampaign,
  getCurrentUser,
  getDonation,
  getProfile,
  getSubscription,
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
export let provider = Slate.create({
  spec,
  tools: [
    listCampaigns,
    getCampaign,
    getCurrentUser,
    getDonation,
    getProfile,
    getSubscription,
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
  triggers: []
});
