import { Slate } from 'slates';
import { spec } from './spec';
import {
  addMemberTool,
  createSpaceTool,
  endActiveConferenceTool,
  getConferenceRecordTool,
  getMemberTool,
  getParticipantSessionsTool,
  getParticipantSessionTool,
  getParticipantTool,
  getRecordingTool,
  getSmartNoteTool,
  getSpaceTool,
  getTranscriptEntryTool,
  getTranscriptTool,
  listConferenceRecordsTool,
  listMembersTool,
  listParticipantsTool,
  listRecordingsTool,
  listSmartNotesTool,
  listTranscriptEntriesTool,
  listTranscriptsTool,
  removeMemberTool,
  updateSpaceTool
} from './tools';
import {
  conferenceEventsTrigger,
  inboundWebhook,
  participantEventsTrigger,
  recordingEventsTrigger,
  transcriptEventsTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createSpaceTool,
    getSpaceTool,
    updateSpaceTool,
    endActiveConferenceTool,
    addMemberTool,
    getMemberTool,
    listMembersTool,
    removeMemberTool,
    listConferenceRecordsTool,
    getConferenceRecordTool,
    getParticipantTool,
    listParticipantsTool,
    getParticipantSessionTool,
    getParticipantSessionsTool,
    listRecordingsTool,
    getRecordingTool,
    listSmartNotesTool,
    getSmartNoteTool,
    listTranscriptsTool,
    getTranscriptTool,
    getTranscriptEntryTool,
    listTranscriptEntriesTool
  ],
  triggers: [
    inboundWebhook,
    conferenceEventsTrigger,
    participantEventsTrigger,
    recordingEventsTrigger,
    transcriptEventsTrigger
  ]
});
