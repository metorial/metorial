import { Slate } from 'slates';
import { spec } from './spec';
import {
  getFileUrl,
  getUserInfoTool,
  listMessagesTool,
  listSocialProfilesTool,
  manageMessageTool,
  manageOrganizationMembersTool,
  manageTeamsTool,
  scheduleMessageTool,
  shortenLinkTool,
  uploadMediaTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    scheduleMessageTool,
    listMessagesTool,
    manageMessageTool,
    listSocialProfilesTool,
    uploadMediaTool,
    getUserInfoTool,
    manageOrganizationMembersTool,
    manageTeamsTool,
    shortenLinkTool,
    getFileUrl
  ],
  triggers: []
});
