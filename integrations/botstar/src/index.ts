import { Slate } from 'slates';
import { spec } from './spec';
import {
  broadcastMessage,
  createBot,
  createUserAttribute,
  getBot,
  getCmsEntity,
  getCmsItem,
  getUser,
  listBots,
  listCmsEntities,
  listCmsItems,
  manageBotAttributes,
  manageCmsEntity,
  manageCmsItem,
  publishBot,
  sendMessage,
  updateUser
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listBots,
    getBot,
    createBot,
    getCmsEntity,
    getCmsItem,
    getUser,
    updateUser,
    createUserAttribute,
    broadcastMessage,
    sendMessage,
    listCmsEntities,
    manageCmsEntity,
    listCmsItems,
    manageCmsItem,
    manageBotAttributes,
    publishBot
  ],
  triggers: []
});
