import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCheckin,
  deleteCheckin,
  getCheckin,
  getCheckinResponses,
  getOrganization,
  getTeamMembers,
  getTemplate,
  getUser,
  giveKudos,
  listCheckins,
  listForms,
  listTeams,
  listTemplates,
  listUsers,
  manageTeamMembers,
  sendCheckinReminders,
  sendEmail,
  sendMessage,
  updateCheckin,
  updateUser
} from './tools';
import {
  checkinResponseTrigger,
  formResponseTrigger,
  kudosPostedTrigger,
  organizationEventTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listCheckins,
    getCheckin,
    createCheckin,
    updateCheckin,
    deleteCheckin,
    getCheckinResponses,
    sendCheckinReminders,
    listForms,
    listTemplates,
    getTemplate,
    listUsers,
    getUser,
    updateUser,
    listTeams,
    getTeamMembers,
    manageTeamMembers,
    sendMessage,
    sendEmail,
    giveKudos,
    getOrganization
  ],
  triggers: [
    checkinResponseTrigger,
    formResponseTrigger,
    kudosPostedTrigger,
    organizationEventTrigger
  ]
});
