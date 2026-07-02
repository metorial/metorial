import { createLocalSlateTestClient, expectSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { googleMeetActionScopes } from './scopes';

describe('google-meet provider contract', () => {
  it('exposes the expected provider, tool, trigger, and auth surface', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'google-meet',
        name: 'Google Meet'
      },
      toolIds: [
        'create_space',
        'get_space',
        'update_space',
        'end_active_conference',
        'add_member',
        'get_member',
        'list_members',
        'remove_member',
        'list_conference_records',
        'get_conference_record',
        'get_participant',
        'list_participants',
        'get_participant_session',
        'get_participant_sessions',
        'list_recordings',
        'get_recording',
        'list_smart_notes',
        'get_smart_note',
        'list_transcripts',
        'get_transcript',
        'get_transcript_entry',
        'list_transcript_entries'
      ],
      triggerIds: [
        'inbound_webhook',
        'conference_events',
        'participant_events',
        'recording_events',
        'transcript_events'
      ],
      authMethodIds: ['google_oauth'],
      tools: [
        { id: 'create_space', readOnly: false, destructive: false },
        { id: 'get_space', readOnly: true, destructive: false },
        { id: 'update_space', readOnly: false, destructive: false },
        { id: 'end_active_conference', readOnly: false, destructive: true },
        { id: 'add_member', readOnly: false, destructive: false },
        { id: 'get_member', readOnly: true, destructive: false },
        { id: 'list_members', readOnly: true, destructive: false },
        { id: 'remove_member', readOnly: false, destructive: true },
        { id: 'list_conference_records', readOnly: true, destructive: false },
        { id: 'get_conference_record', readOnly: true, destructive: false },
        { id: 'get_participant', readOnly: true, destructive: false },
        { id: 'list_participants', readOnly: true, destructive: false },
        { id: 'get_participant_session', readOnly: true, destructive: false },
        { id: 'get_participant_sessions', readOnly: true, destructive: false },
        { id: 'list_recordings', readOnly: true, destructive: false },
        { id: 'get_recording', readOnly: true, destructive: false },
        { id: 'list_smart_notes', readOnly: true, destructive: false },
        { id: 'get_smart_note', readOnly: true, destructive: false },
        { id: 'list_transcripts', readOnly: true, destructive: false },
        { id: 'get_transcript', readOnly: true, destructive: false },
        { id: 'get_transcript_entry', readOnly: true, destructive: false },
        { id: 'list_transcript_entries', readOnly: true, destructive: false }
      ],
      triggers: [
        { id: 'inbound_webhook', invocationType: 'webhook' },
        { id: 'conference_events', invocationType: 'polling' },
        { id: 'participant_events', invocationType: 'polling' },
        { id: 'recording_events', invocationType: 'polling' },
        { id: 'transcript_events', invocationType: 'polling' }
      ]
    });

    expect(contract.actions).toHaveLength(27);
    expect(Object.keys(contract.configSchema.properties ?? {})).toEqual([]);

    let expectedScopes = {
      create_space: googleMeetActionScopes.createSpace,
      get_space: googleMeetActionScopes.getSpace,
      update_space: googleMeetActionScopes.updateSpace,
      end_active_conference: googleMeetActionScopes.endActiveConference,
      add_member: googleMeetActionScopes.addMember,
      get_member: googleMeetActionScopes.getMember,
      list_members: googleMeetActionScopes.listMembers,
      remove_member: googleMeetActionScopes.removeMember,
      list_conference_records: googleMeetActionScopes.listConferenceRecords,
      get_conference_record: googleMeetActionScopes.getConferenceRecord,
      get_participant: googleMeetActionScopes.getParticipant,
      list_participants: googleMeetActionScopes.listParticipants,
      get_participant_session: googleMeetActionScopes.getParticipantSession,
      get_participant_sessions: googleMeetActionScopes.getParticipantSessions,
      list_recordings: googleMeetActionScopes.listRecordings,
      get_recording: googleMeetActionScopes.getRecording,
      list_smart_notes: googleMeetActionScopes.listSmartNotes,
      get_smart_note: googleMeetActionScopes.getSmartNote,
      list_transcripts: googleMeetActionScopes.listTranscripts,
      get_transcript: googleMeetActionScopes.getTranscript,
      get_transcript_entry: googleMeetActionScopes.getTranscriptEntry,
      list_transcript_entries: googleMeetActionScopes.listTranscriptEntries,
      inbound_webhook: googleMeetActionScopes.inboundWebhook,
      conference_events: googleMeetActionScopes.conferenceEvents,
      participant_events: googleMeetActionScopes.participantEvents,
      recording_events: googleMeetActionScopes.recordingEvents,
      transcript_events: googleMeetActionScopes.transcriptEvents
    };

    for (let [actionId, scopes] of Object.entries(expectedScopes)) {
      expect(contract.actions.find(action => action.id === actionId)?.scopes).toEqual(scopes);
    }

    let oauth = await client.getAuthMethod('google_oauth');
    expect(oauth.authenticationMethod.type).toBe('auth.oauth');
    expect(oauth.authenticationMethod.capabilities.handleTokenRefresh?.enabled).toBe(true);
    expect(oauth.authenticationMethod.capabilities.getProfile?.enabled).toBe(true);
  });
});
