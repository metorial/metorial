import { Slate } from 'slates';
import { spec } from './spec';
import {
  addMember,
  createMeeting,
  createSpace,
  createTeam,
  deleteMeeting,
  deleteMessage,
  deleteSpace,
  deleteTeam,
  editMessage,
  getMeeting,
  getMessage,
  getPersonDetails,
  getRecording,
  getSpace,
  listMeetings,
  listMemberships,
  listMessages,
  listPeople,
  listRecordings,
  listSpaces,
  listTeams,
  removeMember,
  sendMessage,
  updateMeeting,
  updateMember,
  updateSpace
} from './tools';
import {
  attachmentActionEvents,
  meetingEvents,
  membershipEvents,
  messageEvents,
  roomEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    sendMessage,
    getMessage,
    listMessages,
    editMessage,
    deleteMessage,
    createSpace,
    updateSpace,
    deleteSpace,
    getSpace,
    listSpaces,
    addMember,
    updateMember,
    removeMember,
    listMemberships,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    getMeeting,
    listMeetings,
    listPeople,
    getPersonDetails,
    listRecordings,
    getRecording,
    listTeams,
    createTeam,
    deleteTeam
  ],
  triggers: [
    messageEvents,
    roomEvents,
    membershipEvents,
    meetingEvents,
    attachmentActionEvents
  ]
});
