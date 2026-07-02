import { Slate } from 'slates';
import { spec } from './spec';
import {
  addWhitelistedDomain,
  createGroup,
  createVideo,
  deleteVideos,
  getTopVideos,
  getVideoAnalytics,
  listGroups,
  listVideos,
  listWhitelistedDomains,
  updatePlayerSettings,
  updateVideoSource
} from './tools';
import { videoWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listVideos,
    createVideo,
    deleteVideos,
    getVideoAnalytics,
    getTopVideos,
    updateVideoSource,
    listGroups,
    createGroup,
    updatePlayerSettings,
    listWhitelistedDomains,
    addWhitelistedDomain
  ],
  triggers: [videoWebhook]
});
