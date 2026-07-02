import { Slate } from 'slates';
import { spec } from './spec';
import {
  createGroup,
  createUser,
  createVideo,
  deleteGroup,
  deleteUser,
  getGroup,
  getVideoDownload,
  getVideoTranscript,
  inviteUsers,
  listGroups,
  listPortfolios,
  listUsers,
  listVideos,
  manageGroupMembers,
  managePortfolio,
  manageTagSessionNotes,
  manageVideoComments,
  updateGroup,
  updateUser
} from './tools';
import { inboundWebhook, newVideo } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listVideos,
    createVideo,
    getVideoDownload,
    getVideoTranscript,
    listUsers,
    createUser,
    inviteUsers,
    updateUser,
    deleteUser,
    listGroups,
    getGroup,
    createGroup,
    updateGroup,
    deleteGroup,
    manageGroupMembers,
    manageVideoComments,
    manageTagSessionNotes,
    managePortfolio,
    listPortfolios
  ],
  triggers: [inboundWebhook, newVideo]
});
