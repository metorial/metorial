import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelBotForEventTool,
  createBotTool,
  deleteBotTool,
  downloadRecordingTool,
  getBotTool,
  getCalendarEventTool,
  getCalendarTool,
  getFileUrl,
  getRecordingTool,
  getTranscriptTool,
  listBotsTool,
  listCalendarEventsTool,
  listCalendarsTool,
  listRecordingsTool,
  outputMediaTool,
  removeBotFromCallTool,
  scheduleBotForEventTool,
  sendChatMessageTool,
  updateBotTool
} from './tools';
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
    scheduleBotForEventTool,
    getCalendarTool,
    getCalendarEventTool,
    cancelBotForEventTool,
    listRecordingsTool,
    getRecordingTool,
    downloadRecordingTool,
    getFileUrl
  ],
  triggers: []
});
