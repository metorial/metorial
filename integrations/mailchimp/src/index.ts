import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  addMemberEventTool,
  getAudienceActivityTool,
  getCampaignReportTool,
  listAudiencesTool,
  listAutomationsTool,
  listCampaignsTool,
  listMembersTool,
  listTemplatesTool,
  manageAudienceTool,
  manageAutomationTool,
  manageCampaignContentTool,
  manageCampaignTool,
  manageFileManagerTool,
  manageInterestGroupsTool,
  manageMemberTool,
  manageMergeFieldsTool,
  manageSegmentsTool,
  manageTagsTool,
  manageTemplateTool,
  searchMembersTool,
  sendCampaignTool
} from './tools';
import { audienceWebhookTrigger, campaignActivityTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listAudiencesTool,
    manageAudienceTool,
    listMembersTool,
    manageMemberTool,
    manageTagsTool,
    listCampaignsTool,
    manageCampaignTool,
    sendCampaignTool,
    manageCampaignContentTool,
    listTemplatesTool,
    manageTemplateTool,
    listAutomationsTool,
    manageAutomationTool,
    getCampaignReportTool,
    searchMembersTool,
    manageSegmentsTool,
    getAudienceActivityTool,
    addMemberEventTool,
    manageMergeFieldsTool,
    manageInterestGroupsTool,
    manageFileManagerTool
  ],
  triggers: [audienceWebhookTrigger, campaignActivityTrigger]
});
