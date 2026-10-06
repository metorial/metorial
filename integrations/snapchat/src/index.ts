import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  addUsersToSegment,
  createMedia,
  deleteCampaign,
  getAudienceSize,
  getBidEstimate,
  getCampaignStats,
  getFundingSources,
  listAdAccounts,
  listAdSquads,
  listAds,
  listAudienceSegments,
  listCampaigns,
  listCreatives,
  listOrganizations,
  manageAd,
  manageAdSquad,
  manageAudienceSegment,
  manageCampaign,
  manageCreative,
  managePixel,
  sendConversionEvent
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listOrganizations,
    listAdAccounts,
    listCampaigns,
    manageCampaign,
    deleteCampaign,
    listAdSquads,
    manageAdSquad,
    listAds,
    manageAd,
    listCreatives,
    manageCreative,
    createMedia,
    listAudienceSegments,
    manageAudienceSegment,
    addUsersToSegment,
    getCampaignStats,
    sendConversionEvent,
    managePixel,
    getFundingSources,
    getAudienceSize,
    getBidEstimate
  ],
  triggers: []
});
