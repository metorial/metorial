import { Slate } from 'slates';
import { spec } from './spec';
import {
  changeMessageVisibility,
  createQueue,
  deleteMessage,
  deleteQueue,
  getQueueUrl,
  listQueues,
  manageMessageMoveTask,
  manageQueue,
  purgeQueue,
  receiveMessages,
  sendMessage,
  sendMessageBatch
} from './tools';
import { inboundWebhook, newMessage } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createQueue,
    deleteQueue,
    listQueues,
    getQueueUrl,
    manageQueue,
    sendMessage,
    sendMessageBatch,
    receiveMessages,
    deleteMessage,
    purgeQueue,
    changeMessageVisibility,
    manageMessageMoveTask
  ],
  triggers: [inboundWebhook, newMessage]
});
