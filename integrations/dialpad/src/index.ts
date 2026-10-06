import { Slate } from 'slates';
import { spec } from './spec';
import {
  getCompanyTool,
  getResourceTool,
  getUserTool,
  initiateCallTool,
  listCallCentersTool,
  listCallsTool,
  listContactsTool,
  listOfficesTool,
  listResourcesTool,
  listUsersTool,
  manageBlockedNumberTool,
  manageCallCenterTool,
  manageCallTool,
  manageContactTool,
  managePhoneNumberTool,
  manageUserTool,
  sendSmsTool
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listUsersTool,
    getUserTool,
    manageUserTool,
    listContactsTool,
    manageContactTool,
    sendSmsTool,
    initiateCallTool,
    listCallsTool,
    manageCallTool,
    listCallCentersTool,
    manageCallCenterTool,
    managePhoneNumberTool,
    listOfficesTool,
    manageBlockedNumberTool,
    getCompanyTool,
    getResourceTool,
    listResourcesTool
  ],
  triggers: []
});
