import { Slate } from 'slates';
import { spec } from './spec';
import {
  addContact,
  createConference,
  deleteConference,
  deleteFile,
  generateAutologinUrl,
  generateSessionPdf,
  getChatLogs,
  getConference,
  getFile,
  getPhoneGateways,
  getSessionAttendees,
  getSessions,
  getTimezones,
  getTokensByEmail,
  listAccountRecordings,
  listConferences,
  listFiles,
  listRegistrations,
  manageAccessTokens,
  manageRecordings,
  registerAttendee,
  sendInvitations,
  updateConference,
  uploadFile
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    listConferences,
    getConference,
    createConference,
    updateConference,
    deleteConference,
    manageAccessTokens,
    registerAttendee,
    listRegistrations,
    getSessions,
    getSessionAttendees,
    generateSessionPdf,
    sendInvitations,
    generateAutologinUrl,
    listFiles,
    getFile,
    deleteFile,
    manageRecordings,
    addContact,
    getChatLogs,
    getTimezones,
    getPhoneGateways,
    getTokensByEmail,
    listAccountRecordings,
    uploadFile
  ],
  triggers: []
});
