import { Slate } from 'slates';
import { spec } from './spec';
import {
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
import { hootsuiteEventsTrigger } from './triggers';

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
    shortenLinkTool
  ],
  triggers: [hootsuiteEventsTrigger]
});
