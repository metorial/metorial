import { Slate } from 'slates';
import { spec } from './spec';
import {
  createVideo,
  deleteSubtitles,
  deleteVideo,
  getActivity,
  getSubtitles,
  getUser,
  getVideo,
  listLanguages,
  listProjects,
  listSubtitleLanguages,
  listSubtitleRequests,
  listTeamMembers,
  listTeams,
  listVideos,
  manageApplication,
  manageProject,
  manageSubtitleRequest,
  manageTeam,
  manageTeamMember,
  sendMessage,
  subtitleActions,
  subtitleNotes,
  teamLanguages,
  updateVideo,
  uploadSubtitles
} from './tools';
import { inboundWebhook, teamActivity, teamNotifications } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listVideos,
    getVideo,
    createVideo,
    updateVideo,
    deleteVideo,
    listSubtitleLanguages,
    getSubtitles,
    uploadSubtitles,
    deleteSubtitles,
    subtitleActions,
    subtitleNotes,
    listTeams,
    manageTeam,
    listTeamMembers,
    manageTeamMember,
    listProjects,
    manageProject,
    manageApplication,
    teamLanguages,
    listSubtitleRequests,
    manageSubtitleRequest,
    getActivity,
    getUser,
    sendMessage,
    listLanguages
  ],
  triggers: [inboundWebhook, teamActivity, teamNotifications]
});
