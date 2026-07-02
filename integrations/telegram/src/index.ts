import { Slate } from 'slates';
import { spec } from './spec';
import {
  answerCallbackQueryTool,
  answerInlineQueryTool,
  deleteMessageTool,
  editMessageTool,
  forwardMessageTool,
  getChatTool,
  getFileTool,
  manageChatMemberTool,
  pinMessageTool,
  sendInvoiceTool,
  sendMediaTool,
  sendMessageTool,
  sendPollTool,
  stopPollTool,
  updateChatTool
} from './tools';
import {
  callbackQueryReceivedTrigger,
  chatBoostUpdatedTrigger,
  chatMemberUpdatedTrigger,
  inlineQueryReceivedTrigger,
  messageReceivedTrigger,
  paymentReceivedTrigger,
  pollUpdatedTrigger,
  reactionUpdatedTrigger
} from './triggers';

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
    getFileTool
  ],
  triggers: [
    messageReceivedTrigger,
    callbackQueryReceivedTrigger,
    inlineQueryReceivedTrigger,
    chatMemberUpdatedTrigger,
    pollUpdatedTrigger,
    paymentReceivedTrigger,
    chatBoostUpdatedTrigger,
    reactionUpdatedTrigger
  ]
});
