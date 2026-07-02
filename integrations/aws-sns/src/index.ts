import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkSmsOptOut,
  confirmSubscription,
  createTopic,
  deleteTopic,
  getSmsStatus,
  getSubscription,
  getTopic,
  listOriginationNumbers,
  listSubscriptions,
  listTopics,
  publishBatch,
  publishMessage,
  sendSms,
  subscribeToTopic,
  unsubscribeFromTopic,
  updateSmsSettings,
  updateSubscription,
  updateTopic
} from './tools';
import { topicNotification } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createTopic,
    deleteTopic,
    listTopics,
    getTopic,
    updateTopic,
    publishMessage,
    publishBatch,
    subscribeToTopic,
    unsubscribeFromTopic,
    getSubscription,
    listSubscriptions,
    updateSubscription,
    confirmSubscription,
    sendSms,
    getSmsStatus,
    updateSmsSettings,
    checkSmsOptOut,
    listOriginationNumbers
  ],
  triggers: [topicNotification]
});
