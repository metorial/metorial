import { Slate } from 'slates';
import { spec } from './spec';
import {
  getMeetingDetails,
  getSummary,
  getTranscript,
  listMeetings,
  listTeams
} from './tools';
import { meetingContentReady } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [listMeetings, getMeetingDetails, getTranscript, getSummary, listTeams],
  triggers: [meetingContentReady]
});
