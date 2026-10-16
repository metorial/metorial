import { Slate } from 'slates';
import { spec } from './spec';
import {
  addWhitelistedDomain,
  createGroup,
  createVideo,
  deleteVideos,
  expireAccess,
  expireAccessCode,
  getTopVideos,
  getVideoAnalytics,
  listGroups,
  listVideos,
  listWhitelistedDomains,
  searchAccount,
  updatePlayerSettings,
  updateVideoSource
} from './tools';
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
    addWhitelistedDomain,
    searchAccount,
    expireAccess,
    expireAccessCode
  ],
  triggers: []
});
