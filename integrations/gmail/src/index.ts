import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteMessagesPermanently,
  deleteThreadPermanently,
  forwardMessage,
  getAttachment,
  getGoogleContact,
  getMessage,
  getProfile,
  importMessage,
  insertMessage,
  listGoogleContacts,
  manageDraft,
  manageLabels,
  manageSettings,
  manageThread,
  modifyMessage,
  searchGoogleContacts,
  searchMessages,
  sendEmail
} from './tools';
import { messagesGroup, newMessage } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    sendEmail.build(),
    forwardMessage.build(),
    searchMessages.build(),
    getMessage.build(),
    getProfile.build(),
    modifyMessage.build(),
    deleteMessagesPermanently.build(),
    manageDraft.build(),
    manageLabels.build(),
    manageThread.build(),
    deleteThreadPermanently.build(),
    manageSettings.build(),
    getAttachment.build(),
    listGoogleContacts,
    searchGoogleContacts,
    getGoogleContact,
    importMessage.build(),
    insertMessage.build()
  ],
  triggerGroups: [messagesGroup],
  triggers: [newMessage]
});
