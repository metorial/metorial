import { anyOf } from '@slates/provider';

export let firebaseScopes = {
  cloudPlatform: 'https://www.googleapis.com/auth/cloud-platform',
  firebaseDatabase: 'https://www.googleapis.com/auth/firebase.database',
  userInfoEmail: 'https://www.googleapis.com/auth/userinfo.email',
  userInfoProfile: 'https://www.googleapis.com/auth/userinfo.profile'
} as const;

let firestoreOrAdmin = anyOf(firebaseScopes.cloudPlatform);

let realtimeOrCloud = anyOf(firebaseScopes.firebaseDatabase, firebaseScopes.cloudPlatform);

export let firebaseActionScopes = {
  manageFirestoreDocument: firestoreOrAdmin,
  queryFirestore: firestoreOrAdmin,
  manageRealtimeData: realtimeOrCloud,
  manageUser: firestoreOrAdmin,
  listUsers: firestoreOrAdmin,
  lookupUser: firestoreOrAdmin,
  sendFcmMessage: firestoreOrAdmin,
  manageTopicSubscriptions: firestoreOrAdmin,
  getRemoteConfig: firestoreOrAdmin,
  updateRemoteConfig: firestoreOrAdmin,
  manageStorage: firestoreOrAdmin,
  getFirebaseApps: firestoreOrAdmin,
  firestoreDocumentChanges: firestoreOrAdmin,
  realtimeDbChanges: realtimeOrCloud,
  userChanges: firestoreOrAdmin,
  inboundWebhook: realtimeOrCloud
} as const;
