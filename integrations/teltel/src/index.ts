import { Slate } from 'slates';
import { spec } from './spec';
import {
  hlrLookupTool,
  initiateCallTool,
  listCallsTool,
  listCampaignsTool,
  listSmsTool,
  listUsersTool,
  manageCampaignTool,
  manageContactsTool,
  sendSmsTool
} from './tools';
import { callEventTrigger, smsEventTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    initiateCallTool,
    sendSmsTool,
    listSmsTool,
    listCallsTool,
    hlrLookupTool,
    listUsersTool,
    listCampaignsTool,
    manageCampaignTool,
    manageContactsTool
  ],
  triggers: [callEventTrigger, smsEventTrigger]
});
