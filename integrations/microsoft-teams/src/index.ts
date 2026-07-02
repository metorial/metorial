import { Slate } from 'slates';
import { spec } from './spec';
import {
  createTeam,
  deleteTeam,
  getPresence,
  getTeam,
  listChannelMessages,
  listChannels,
  listChatMessages,
  listChats,
  listTeams,
  manageChannel,
  manageMembers,
  manageOnlineMeeting,
  manageShifts,
  manageTags,
  sendChannelMessage,
  sendChatMessage,
  updateTeam
} from './tools';
import {
  channelChangeTrigger,
  channelMessageTrigger,
  chatMessageTrigger,
  membershipChangeTrigger,
  teamChangeTrigger
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listTeams,
    getTeam,
    createTeam,
    updateTeam,
    deleteTeam,
    listChannels,
    manageChannel,
    sendChannelMessage,
    listChannelMessages,
    listChats,
    sendChatMessage,
    listChatMessages,
    manageMembers,
    manageOnlineMeeting,
    getPresence,
    manageTags,
    manageShifts
  ],
  triggers: [
    channelMessageTrigger,
    chatMessageTrigger,
    teamChangeTrigger,
    membershipChangeTrigger,
    channelChangeTrigger
  ]
});
