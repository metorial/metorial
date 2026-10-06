import { Slate } from 'slates';
import { spec } from './spec';
import {
  discoverQueryTool,
  getEventTool,
  getIssueTool,
  getOrganizationTool,
  listIssuesTool,
  listMembersTool,
  listProjectsTool,
  listTeamsTool,
  manageAlertRuleTool,
  manageIssueCommentTool,
  manageMonitorTool,
  manageProjectTool,
  manageReleaseTool,
  manageTeamTool,
  updateIssueTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listIssuesTool,
    getIssueTool,
    updateIssueTool,
    listProjectsTool,
    manageProjectTool,
    listTeamsTool,
    manageTeamTool,
    manageReleaseTool,
    manageAlertRuleTool,
    manageMonitorTool,
    discoverQueryTool,
    getEventTool,
    manageIssueCommentTool,
    getOrganizationTool,
    listMembersTool
  ],
  triggers: []
});
