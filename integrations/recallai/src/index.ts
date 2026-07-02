import { Slate } from 'slates';
import { spec } from './spec';
import {
  createBotTool,
  deleteBotTool,
  getBotTool,
  getTranscriptTool,
  listBotsTool,
  listCalendarEventsTool,
  listCalendarsTool,
  outputMediaTool,
  removeBotFromCallTool,
  scheduleBotForEventTool,
  sendChatMessageTool,
  updateBotTool
} from './tools';
import {
  botStatusChangeTrigger,
  calendarEventChangeTrigger,
  recordingStatusChangeTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createBotTool,
    listBotsTool,
    getBotTool,
    updateBotTool,
    deleteBotTool,
    removeBotFromCallTool,
    getTranscriptTool,
    sendChatMessageTool,
    outputMediaTool,
    listCalendarsTool,
    listCalendarEventsTool,
    scheduleBotForEventTool
  ],
  triggers: [botStatusChangeTrigger, recordingStatusChangeTrigger, calendarEventChangeTrigger]
});
