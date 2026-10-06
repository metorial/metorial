import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  getFirebaseApps,
  getRemoteConfig,
  listUsers,
  lookupUser,
  manageFirestoreDocument,
  manageRealtimeData,
  manageStorage,
  manageTopicSubscriptions,
  manageUser,
  queryFirestore,
  sendFcmMessage,
  updateRemoteConfig
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    manageFirestoreDocument,
    queryFirestore,
    manageRealtimeData,
    manageUser,
    listUsers,
    lookupUser,
    sendFcmMessage,
    manageTopicSubscriptions,
    getRemoteConfig,
    updateRemoteConfig,
    manageStorage,
    getFirebaseApps
  ],
  triggers: []
});
