import { Slate } from 'slates';
import { spec } from './spec';
import {
  getPresence,
  listCallLogs,
  listExtensions,
  listMessages,
  listPhoneNumbers,
  makeCall,
  manageCall,
  manageMeeting,
  sendFax,
  sendSms,
  sendTeamMessage,
  updatePresence
} from './tools';
import {
  messageEvents,
  presenceEvents,
  smsEvents,
  teamMessagingEvents,
  telephonyEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    sendSms,
    sendFax,
    makeCall,
    manageCall,
    listCallLogs,
    sendTeamMessage,
    manageMeeting,
    listMessages,
    getPresence,
    updatePresence,
    listExtensions,
    listPhoneNumbers
  ],
  triggers: [telephonyEvents, smsEvents, presenceEvents, messageEvents, teamMessagingEvents]
});
