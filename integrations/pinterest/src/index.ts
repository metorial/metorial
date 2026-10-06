import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  createPin,
  deletePin,
  getAnalytics,
  getPin,
  getTerms,
  getTrends,
  getUserAccount,
  listAdAccounts,
  listBoards,
  listCampaigns,
  listCatalogs,
  listPins,
  manageAudience,
  manageBoard,
  manageBoardSection,
  savePin,
  searchPins,
  sendConversions,
  updatePin
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createPin,
    getPin,
    listPins,
    updatePin,
    deletePin,
    manageBoard,
    listBoards,
    manageBoardSection,
    getUserAccount,
    getAnalytics,
    listAdAccounts,
    listCampaigns,
    sendConversions,
    listCatalogs,
    getTrends,
    getTerms,
    searchPins,
    manageAudience,
    savePin
  ],
  triggers: []
});
