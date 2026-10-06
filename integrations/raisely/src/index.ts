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
  triggers: []
});
