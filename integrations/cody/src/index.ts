import { Slate } from 'slates';
import { spec } from './spec';
import {
  createConversation,
  createDocumentFromContent,
  createDocumentFromFile,
  createDocumentFromWebpage,
  createFolder,
  deleteConversation,
  deleteDocument,
  getConversation,
  getDocument,
  getFolder,
  getMessage,
  getUploadUrl,
  listBots,
  listConversations,
  listDocuments,
  listFolders,
  listMessages,
  sendMessage,
  sendMessageForStream,
  updateConversation,
  updateFolder
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    listBots.build(),
    listFolders.build(),
    createFolder.build(),
    updateFolder.build(),
    getFolder.build(),
    listDocuments.build(),
    getDocument.build(),
    createDocumentFromContent.build(),
    createDocumentFromWebpage.build(),
    getUploadUrl.build(),
    createDocumentFromFile.build(),
    deleteDocument.build(),
    listConversations.build(),
    getConversation.build(),
    createConversation.build(),
    updateConversation.build(),
    deleteConversation.build(),
    sendMessage.build(),
    sendMessageForStream.build(),
    listMessages.build(),
    getMessage.build()
  ],
  triggers: [inboundWebhook]
});
