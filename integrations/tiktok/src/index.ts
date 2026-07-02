import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  createAdGroup,
  getAdGroups,
  getAdReport,
  getAds,
  getCampaigns,
  getCreatorInfo,
  getPublishStatus,
  getUserProfile,
  listAdvertisers,
  listVideos,
  manageCampaign,
  postPhoto,
  postVideo,
  queryVideos
} from './tools';
import { businessWebhook, consumerWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getUserProfile,
    listVideos,
    queryVideos,
    getCreatorInfo,
    postVideo,
    postPhoto,
    getPublishStatus,
    listAdvertisers,
    getCampaigns,
    manageCampaign,
    getAdGroups,
    createAdGroup,
    getAds,
    getAdReport
  ],
  triggers: [consumerWebhook, businessWebhook]
});
