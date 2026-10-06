import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelDonation,
  createDonation,
  createGift,
  getCauses,
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
    createGift,
    listGifts,
    getGift,
    searchNonprofits,
    getNonprofit
  ],
  triggers: []
});
