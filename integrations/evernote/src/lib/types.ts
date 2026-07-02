// Evernote data types mapped from Thrift IDL

export interface EvernoteNote {
  noteGuid?: string;
  title?: string;
  content?: string;
  contentHash?: string;
  contentLength?: number;
  created?: number;
  updated?: number;
  deleted?: number;
  active?: boolean;
  updateSequenceNum?: number;
  notebookGuid?: string;
  tagGuids?: string[];
  tagNames?: string[];
  resources?: EvernoteResource[];
  attributes?: EvernoteNoteAttributes;
}

export interface EvernoteNoteAttributes {
  subjectDate?: number;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  author?: string;
  source?: string;
  sourceUrl?: string;
  sourceApplication?: string;
  shareDate?: number;
  reminderOrder?: number;
  reminderDoneTime?: number;
  reminderTime?: number;
  placeName?: string;
  contentClass?: string;
}

export interface EvernoteNotebook {
  notebookGuid?: string;
  name?: string;
  updateSequenceNum?: number;
  defaultNotebook?: boolean;
  serviceCreated?: number;
  serviceUpdated?: number;
  stack?: string;
}

export interface EvernoteTag {
  tagGuid?: string;
  name?: string;
  parentGuid?: string;
  updateSequenceNum?: number;
}

export interface EvernoteResource {
  resourceGuid?: string;
  noteGuid?: string;
  mime?: string;
  width?: number;
  height?: number;
  active?: boolean;
  attributes?: EvernoteResourceAttributes;
  data?: EvernoteData;
}

export interface EvernoteData {
  bodyHash?: Uint8Array;
  size?: number;
  body?: Uint8Array;
}

export interface EvernoteResourceAttributes {
  sourceUrl?: string;
  timestamp?: number;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  cameraMake?: string;
  cameraModel?: string;
  fileName?: string;
  attachment?: boolean;
}

export interface EvernoteSavedSearch {
  searchGuid?: string;
  name?: string;
  query?: string;
  format?: number;
  updateSequenceNum?: number;
}

export interface EvernoteNoteFilter {
  order?: number;
  ascending?: boolean;
  words?: string;
  notebookGuid?: string;
  tagGuids?: string[];
  timeZone?: string;
  inactive?: boolean;
}

export interface EvernoteNotesMetadataResultSpec {
  includeTitle?: boolean;
  includeContentLength?: boolean;
  includeCreated?: boolean;
  includeUpdated?: boolean;
  includeDeleted?: boolean;
  includeUpdateSequenceNum?: boolean;
  includeNotebookGuid?: boolean;
  includeTagGuids?: boolean;
  includeAttributes?: boolean;
  includeLargestResourceMime?: boolean;
  includeLargestResourceSize?: boolean;
}

export interface EvernoteNoteMetadata {
  noteGuid: string;
  title?: string;
  contentLength?: number;
  created?: number;
  updated?: number;
  deleted?: number;
  updateSequenceNum?: number;
  notebookGuid?: string;
  tagGuids?: string[];
  attributes?: EvernoteNoteAttributes;
  largestResourceMime?: string;
  largestResourceSize?: number;
}

export interface EvernoteNotesMetadataList {
  startIndex: number;
  totalNotes: number;
  notes: EvernoteNoteMetadata[];
  stoppedWords?: string[];
  searchedWords?: string[];
  updateCount?: number;
}

export interface EvernoteUser {
  userId?: number;
  username?: string;
  email?: string;
  name?: string;
  timezone?: string;
  privilege?: number;
  serviceLevel?: number;
  created?: number;
  updated?: number;
  active?: boolean;
  shardId?: string;
  photoUrl?: string;
}

export interface EvernoteSyncState {
  currentTime: number;
  fullSyncBefore: number;
  updateCount: number;
  uploaded: number;
}

export interface EvernoteNoteResultSpec {
  includeContent?: boolean;
  includeResourcesData?: boolean;
  includeResourcesRecognition?: boolean;
  includeResourcesAlternateData?: boolean;
  includeSharedNotes?: boolean;
  includeNoteAppDataValues?: boolean;
  includeResourceAppDataValues?: boolean;
  includeAccountLimits?: boolean;
}
