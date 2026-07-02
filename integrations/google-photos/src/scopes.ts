import { anyOf } from 'slates';

export let googlePhotosScopes = {
  photospickerMediaitemsReadonly:
    'https://www.googleapis.com/auth/photospicker.mediaitems.readonly',
  photoslibraryAppendonly: 'https://www.googleapis.com/auth/photoslibrary.appendonly',
  photoslibraryReadonlyAppcreateddata:
    'https://www.googleapis.com/auth/photoslibrary.readonly.appcreateddata',
  photoslibraryEditAppcreateddata:
    'https://www.googleapis.com/auth/photoslibrary.edit.appcreateddata',
  userInfoProfile: 'https://www.googleapis.com/auth/userinfo.profile',
  userInfoEmail: 'https://www.googleapis.com/auth/userinfo.email'
} as const;

export let googlePhotosActionScopes = {
  listAlbums: anyOf(
    googlePhotosScopes.photoslibraryReadonlyAppcreateddata,
    googlePhotosScopes.photoslibraryAppendonly
  ),
  getAlbum: anyOf(
    googlePhotosScopes.photoslibraryReadonlyAppcreateddata,
    googlePhotosScopes.photoslibraryAppendonly
  ),
  createAlbum: anyOf(googlePhotosScopes.photoslibraryAppendonly),
  updateAlbum: anyOf(googlePhotosScopes.photoslibraryEditAppcreateddata),
  manageAlbumMedia: anyOf(googlePhotosScopes.photoslibraryEditAppcreateddata),
  addAlbumEnrichment: anyOf(googlePhotosScopes.photoslibraryEditAppcreateddata),
  getMediaItem: anyOf(
    googlePhotosScopes.photoslibraryReadonlyAppcreateddata,
    googlePhotosScopes.photoslibraryAppendonly
  ),
  searchMediaItems: anyOf(googlePhotosScopes.photoslibraryReadonlyAppcreateddata),
  updateMediaItem: anyOf(googlePhotosScopes.photoslibraryEditAppcreateddata),
  uploadMedia: anyOf(googlePhotosScopes.photoslibraryAppendonly),
  createPickerSession: anyOf(googlePhotosScopes.photospickerMediaitemsReadonly),
  getPickerSession: anyOf(googlePhotosScopes.photospickerMediaitemsReadonly),
  listPickedMedia: anyOf(googlePhotosScopes.photospickerMediaitemsReadonly),
  deletePickerSession: anyOf(googlePhotosScopes.photospickerMediaitemsReadonly),
  inboundWebhook: anyOf(
    googlePhotosScopes.photoslibraryReadonlyAppcreateddata,
    googlePhotosScopes.photospickerMediaitemsReadonly
  )
} as const;
