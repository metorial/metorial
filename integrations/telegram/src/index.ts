import { Slate } from 'slates';
import { telegramChatAdapter } from './chat';
import { spec } from './spec';
import {
  answerCallbackQueryTool,
  answerInlineQueryTool,
  deleteMessageTool,
  editMessageTool,
  forwardMessageTool,
  getChatTool,
  getFileTool,
  getFileUrl,
  manageChatMemberTool,
  pinMessageTool,
  sendInvoiceTool,
  sendMediaTool,
  sendMessageTool,
  sendPollTool,
  stopPollTool,
  updateChatTool
} from './tools';
import { telegramUpdatesTriggerGroup } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    sendMessageTool,
    editMessageTool,
    deleteMessageTool,
    forwardMessageTool,
    sendMediaTool,
    getChatTool,
    updateChatTool,
    manageChatMemberTool,
    pinMessageTool,
    sendPollTool,
    stopPollTool,
    sendInvoiceTool,
    answerCallbackQueryTool,
    answerInlineQueryTool,
    getFileTool,
    getFileUrl
  ],
  adapters: [telegramChatAdapter],
  triggerGroups: [telegramUpdatesTriggerGroup],
  triggers: []
});
