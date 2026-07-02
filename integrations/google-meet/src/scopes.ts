import { anyOf } from 'slates';

export let googleMeetScopes = {
  spaceCreated: 'https://www.googleapis.com/auth/meetings.space.created',
  spaceReadonly: 'https://www.googleapis.com/auth/meetings.space.readonly',
  spaceSettings: 'https://www.googleapis.com/auth/meetings.space.settings',
  driveReadonly: 'https://www.googleapis.com/auth/drive.readonly',
  driveMeetReadonly: 'https://www.googleapis.com/auth/drive.meet.readonly',
  userInfoProfile: 'https://www.googleapis.com/auth/userinfo.profile',
  userInfoEmail: 'https://www.googleapis.com/auth/userinfo.email'
} as const;

let meetSpaceRead = anyOf(
  googleMeetScopes.spaceReadonly,
  googleMeetScopes.spaceCreated,
  googleMeetScopes.spaceSettings
);

let meetSpaceMutate = anyOf(googleMeetScopes.spaceCreated, googleMeetScopes.spaceSettings);

let meetMembership = anyOf(googleMeetScopes.spaceCreated);

export let googleMeetActionScopes = {
  createSpace: anyOf(googleMeetScopes.spaceCreated),
  getSpace: meetSpaceRead,
  updateSpace: meetSpaceMutate,
  endActiveConference: meetSpaceMutate,
  addMember: meetMembership,
  getMember: meetSpaceRead,
  listMembers: meetSpaceRead,
  removeMember: meetMembership,
  listConferenceRecords: meetSpaceRead,
  getConferenceRecord: meetSpaceRead,
  getParticipant: meetSpaceRead,
  listParticipants: meetSpaceRead,
  getParticipantSession: meetSpaceRead,
  getParticipantSessions: meetSpaceRead,
  listRecordings: meetSpaceRead,
  getRecording: meetSpaceRead,
  listSmartNotes: meetSpaceRead,
  getSmartNote: meetSpaceRead,
  listTranscripts: meetSpaceRead,
  getTranscript: meetSpaceRead,
  getTranscriptEntry: meetSpaceRead,
  listTranscriptEntries: meetSpaceRead,
  inboundWebhook: meetSpaceRead,
  conferenceEvents: meetSpaceRead,
  participantEvents: meetSpaceRead,
  recordingEvents: meetSpaceRead,
  transcriptEvents: meetSpaceRead
} as const;
