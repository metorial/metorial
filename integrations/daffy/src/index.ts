import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelDonation,
  createDonation,
  createGift,
  getCauses,
  getDonation,
  getFundBalance,
  getGift,
  getNonprofit,
  getUserProfile,
  listContributions,
  listDonations,
  listGifts,
  searchNonprofits
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getUserProfile,
    getFundBalance,
    getCauses,
    listContributions,
    createDonation,
    cancelDonation,
    listDonations,
    getDonation,
    createGift,
    listGifts,
    getGift,
    searchNonprofits,
    getNonprofit
  ],
  triggers: []
});
