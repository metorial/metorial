import { Slate } from 'slates';
import { spec } from './spec';
import {
  createGroup,
  createUser,
  createVideo,
  deleteGroup,
  deleteUser,
  getCurrentUser,
  getGroup,
  getVideo,
  getVideoDownload,
  getVideoTranscript,
  inviteUsers,
  listGroups,
  listOrganisations,
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
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    listOrganisations,
    getVideo,
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
  triggers: []
});
