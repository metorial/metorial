import { Slate } from 'slates';
import { spec } from './spec';
import {
  getCompanyTool,
  getUserTool,
  initiateCallTool,
  listCallCentersTool,
  listCallsTool,
  listContactsTool,
  listOfficesTool,
  listUsersTool,
  manageBlockedNumberTool,
  manageCallCenterTool,
  manageCallTool,
  manageContactTool,
  managePhoneNumberTool,
  manageUserTool,
  sendSmsTool
} from './tools';
import { callEventTrigger, contactEventTrigger, smsEventTrigger } from './triggers';

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
    getCompanyTool
  ],
  triggers: [callEventTrigger, smsEventTrigger, contactEventTrigger]
});
