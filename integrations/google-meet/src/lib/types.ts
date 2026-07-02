// --- Space Types ---

export interface SpaceConfig {
  accessType?: 'ACCESS_TYPE_UNSPECIFIED' | 'OPEN' | 'TRUSTED' | 'RESTRICTED';
  entryPointAccess?: 'ENTRY_POINT_ACCESS_UNSPECIFIED' | 'ALL' | 'CREATOR_APP_ONLY';
  moderation?: 'MODERATION_UNSPECIFIED' | 'OFF' | 'ON';
  moderationRestrictions?: {
    chatRestriction?: 'RESTRICTION_TYPE_UNSPECIFIED' | 'HOSTS_ONLY' | 'NO_RESTRICTION';
    reactionRestriction?: 'RESTRICTION_TYPE_UNSPECIFIED' | 'HOSTS_ONLY' | 'NO_RESTRICTION';
    presentRestriction?: 'RESTRICTION_TYPE_UNSPECIFIED' | 'HOSTS_ONLY' | 'NO_RESTRICTION';
    defaultJoinAsViewerType?: 'DEFAULT_JOIN_AS_VIEWER_TYPE_UNSPECIFIED' | 'ON' | 'OFF';
  };
  attendanceReportGenerationType?:
    | 'ATTENDANCE_REPORT_GENERATION_TYPE_UNSPECIFIED'
    | 'GENERATE_REPORT'
    | 'DO_NOT_GENERATE';
  artifactConfig?: {
    recordingConfig?: {
      autoRecordingGeneration?: 'AUTO_GENERATION_TYPE_UNSPECIFIED' | 'ON' | 'OFF';
    };
    transcriptionConfig?: {
      autoTranscriptionGeneration?: 'AUTO_GENERATION_TYPE_UNSPECIFIED' | 'ON' | 'OFF';
    };
    smartNotesConfig?: {
      autoSmartNotesGeneration?: 'AUTO_GENERATION_TYPE_UNSPECIFIED' | 'ON' | 'OFF';
    };
  };
}

export interface ActiveConference {
  conferenceRecord?: string;
}

export interface Space {
  name?: string;
  meetingUri?: string;
  meetingCode?: string;
  config?: SpaceConfig;
  activeConference?: ActiveConference;
}

// --- Member Types ---

export interface Member {
  name?: string;
  email?: string;
  user?: string;
  role?: 'ROLE_UNSPECIFIED' | 'COHOST';
}

// --- Conference Record Types ---

export interface ConferenceRecord {
  name?: string;
  startTime?: string;
  endTime?: string;
  expireTime?: string;
  space?: string;
}

// --- Participant Types ---

export interface SignedInUser {
  user?: string;
  displayName?: string;
}

export interface AnonymousUser {
  displayName?: string;
}

export interface PhoneUser {
  displayName?: string;
}

export interface Participant {
  name?: string;
  earliestStartTime?: string;
  latestEndTime?: string;
  signedinUser?: SignedInUser;
  anonymousUser?: AnonymousUser;
  phoneUser?: PhoneUser;
}

export interface ParticipantSession {
  name?: string;
  startTime?: string;
  endTime?: string;
}

// --- Recording Types ---

export interface DriveDestination {
  file?: string;
  exportUri?: string;
}

export interface Recording {
  name?: string;
  state?: 'STATE_UNSPECIFIED' | 'STARTED' | 'ENDED' | 'FILE_GENERATED';
  startTime?: string;
  endTime?: string;
  driveDestination?: DriveDestination;
}

// --- Smart Notes Types ---

export interface SmartNote {
  name?: string;
  state?: 'STATE_UNSPECIFIED' | 'STARTED' | 'ENDED' | 'FILE_GENERATED';
  startTime?: string;
  endTime?: string;
  docsDestination?: DocsDestination;
}

// --- Transcript Types ---

export interface DocsDestination {
  document?: string;
  exportUri?: string;
}

export interface Transcript {
  name?: string;
  state?: 'STATE_UNSPECIFIED' | 'STARTED' | 'ENDED' | 'FILE_GENERATED';
  startTime?: string;
  endTime?: string;
  docsDestination?: DocsDestination;
}

export interface TranscriptEntry {
  name?: string;
  participant?: string;
  text?: string;
  languageCode?: string;
  startTime?: string;
  endTime?: string;
}

// --- Pagination ---

export interface PaginatedResponse<T> {
  [key: string]: T[] | string | undefined;
  nextPageToken?: string;
}
