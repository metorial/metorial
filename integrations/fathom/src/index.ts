import { Slate } from 'slates';
import { spec } from './spec';
import {
  getMeetingDetails,
  getSummary,
  getTranscript,
  listMeetings,
  listMeetingTypes,
  listTeamMembers,
  listTeams
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listMeetings,
    getMeetingDetails,
    getTranscript,
    getSummary,
    listTeams,
    listMeetingTypes,
    listTeamMembers
  ],
  triggers: []
});
