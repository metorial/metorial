import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteChannel,
  deleteMedia,
  deleteSchedules,
  finishMediaUpload,
  generateAiContent,
  getAiCredits,
  importMedia,
  listChannels,
  listMedia,
  listPinterestBoards,
  listScheduleGroups,
  listSchedules,
  listTeamMembers,
  listTeams,
  manageScheduleGroup,
  manageTeam,
  manageTeamMembership,
  schedulePost,
  startMediaUpload
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    listTeams.build(),
    manageTeam.build(),
    listTeamMembers.build(),
    manageTeamMembership.build(),
    listChannels.build(),
    deleteChannel.build(),
    schedulePost.build(),
    listSchedules.build(),
    deleteSchedules.build(),
    manageScheduleGroup.build(),
    listScheduleGroups.build(),
    importMedia.build(),
    startMediaUpload.build(),
    finishMediaUpload.build(),
    listMedia.build(),
    deleteMedia.build(),
    generateAiContent.build(),
    getAiCredits.build(),
    listPinterestBoards.build()
  ],
  triggers: [inboundWebhook]
});
