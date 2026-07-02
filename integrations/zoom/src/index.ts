import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  createMeeting,
  createWebinar,
  deleteMeeting,
  deleteRecording,
  deleteWebinar,
  getMeeting,
  getMeetingInvitation,
  getMeetingParticipants,
  getMeetingRecordings,
  getMeetingReport,
  getUser,
  getUserSettings,
  getWebinar,
  listChatChannels,
  listMeetings,
  listRecordings,
  listUsers,
  listWebinars,
  manageChatMessages,
  manageMeetingPolls,
  manageMeetingRegistrants,
  sendChatMessage,
  updateMeeting,
  updateWebinar
} from './tools';
import {
  chatMessageEvents,
  meetingEvents,
  recordingEvents,
  userEvents,
  webinarEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createMeeting,
    getMeeting,
    listMeetings,
    updateMeeting,
    deleteMeeting,
    listUsers,
    getUser,
    getUserSettings,
    createWebinar,
    getWebinar,
    updateWebinar,
    deleteWebinar,
    listWebinars,
    listRecordings,
    getMeetingRecordings,
    sendChatMessage,
    manageChatMessages,
    listChatChannels,
    getMeetingParticipants,
    manageMeetingRegistrants,
    manageMeetingPolls,
    getMeetingInvitation,
    deleteRecording,
    getMeetingReport
  ],
  triggers: [meetingEvents, webinarEvents, recordingEvents, userEvents, chatMessageEvents]
});
