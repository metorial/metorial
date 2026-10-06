import { Slate } from 'slates';
import { spec } from './spec';
import {
  downloadClip,
  getChannelInfo,
  getFollowersSubscribers,
  getStreams,
  getUserInfo,
  getVideos,
  manageChannelPoints,
  manageChatSettings,
  manageClips,
  manageModeration,
  managePolls,
  managePredictions,
  manageRaids,
  manageRoles,
  search,
  sendChatMessage,
  sendShoutout,
  startCommercial,
  updateChannel
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getUserInfo,
    getChannelInfo,
    updateChannel,
    getStreams,
    sendChatMessage,
    manageModeration,
    getFollowersSubscribers,
    manageClips,
    managePolls,
    managePredictions,
    manageChannelPoints,
    manageChatSettings,
    manageRaids,
    search,
    manageRoles,
    startCommercial,
    sendShoutout,
    getVideos,
    downloadClip
  ],
  triggers: []
});
