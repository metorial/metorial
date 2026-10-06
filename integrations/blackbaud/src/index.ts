import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAction,
  createConstituent,
  createGift,
  getAppeal,
  getCampaign,
  getConstituent,
  getFund,
  getGift,
  getGivingSummary,
  getListResults,
  listActions,
  listAppeals,
  listCampaigns,
  listConstituents,
  listFunds,
  listGifts,
  listLists,
  searchConstituents,
  updateAction,
  updateConstituent
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    searchConstituents,
    listConstituents,
    getConstituent,
    createConstituent,
    updateConstituent,
    getGivingSummary,
    listGifts,
    getGift,
    createGift,
    listActions,
    createAction,
    updateAction,
    listCampaigns,
    getCampaign,
    listFunds,
    getFund,
    listAppeals,
    getAppeal,
    listLists,
    getListResults
  ],
  triggers: []
});
