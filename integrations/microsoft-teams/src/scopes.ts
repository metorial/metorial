import { anyOf } from 'slates';

export let microsoftTeamsScopes = {
  userRead: 'User.Read',
  offlineAccess: 'offline_access',
  teamReadBasicAll: 'Team.ReadBasic.All',
  teamCreate: 'Team.Create',
  teamSettingsReadWriteAll: 'TeamSettings.ReadWrite.All',
  channelReadBasicAll: 'Channel.ReadBasic.All',
  channelCreate: 'Channel.Create',
  channelDeleteAll: 'Channel.Delete.All',
  channelSettingsReadWriteAll: 'ChannelSettings.ReadWrite.All',
  chatReadWrite: 'Chat.ReadWrite',
  channelMessageReadAll: 'ChannelMessage.Read.All',
  channelMessageSend: 'ChannelMessage.Send',
  onlineMeetingsReadWrite: 'OnlineMeetings.ReadWrite',
  presenceReadAll: 'Presence.Read.All',
  teamMemberReadWriteAll: 'TeamMember.ReadWrite.All',
  channelMemberReadWriteAll: 'ChannelMember.ReadWrite.All',
  teamworkTagReadWrite: 'TeamworkTag.ReadWrite',
  groupReadWriteAll: 'Group.ReadWrite.All',
  scheduleReadWriteAll: 'Schedule.ReadWrite.All',
  // Requested before the 2026-07 scope de-escalation and no longer offered on
  // the consent list; kept in enforcement clauses so legacy connections that
  // granted them retain capability.
  legacyTeamSettingsReadAll: 'TeamSettings.Read.All',
  legacyChatRead: 'Chat.Read',
  legacyScheduleReadAll: 'Schedule.Read.All'
} as const;

let teamRead = anyOf(
  microsoftTeamsScopes.teamReadBasicAll,
  microsoftTeamsScopes.teamSettingsReadWriteAll,
  microsoftTeamsScopes.legacyTeamSettingsReadAll
);

let channelRead = anyOf(
  microsoftTeamsScopes.channelReadBasicAll,
  microsoftTeamsScopes.channelSettingsReadWriteAll
);

let chatRead = anyOf(microsoftTeamsScopes.chatReadWrite, microsoftTeamsScopes.legacyChatRead);

export let microsoftTeamsActionScopes = {
  listTeams: teamRead,
  getTeam: teamRead,
  createTeam: anyOf(microsoftTeamsScopes.teamCreate, microsoftTeamsScopes.groupReadWriteAll),
  updateTeam: anyOf(
    microsoftTeamsScopes.teamSettingsReadWriteAll,
    microsoftTeamsScopes.groupReadWriteAll
  ),
  deleteTeam: anyOf(microsoftTeamsScopes.groupReadWriteAll),
  listChannels: channelRead,
  manageChannel: anyOf(
    microsoftTeamsScopes.channelCreate,
    microsoftTeamsScopes.channelSettingsReadWriteAll,
    microsoftTeamsScopes.channelDeleteAll
  ),
  listChannelMessages: anyOf(microsoftTeamsScopes.channelMessageReadAll),
  sendChannelMessage: anyOf(microsoftTeamsScopes.channelMessageSend),
  listChats: chatRead,
  listChatMessages: chatRead,
  sendChatMessage: anyOf(microsoftTeamsScopes.chatReadWrite),
  manageMembers: anyOf(
    microsoftTeamsScopes.teamMemberReadWriteAll,
    microsoftTeamsScopes.channelMemberReadWriteAll
  ),
  manageOnlineMeeting: anyOf(microsoftTeamsScopes.onlineMeetingsReadWrite),
  manageShifts: anyOf(
    microsoftTeamsScopes.scheduleReadWriteAll,
    microsoftTeamsScopes.legacyScheduleReadAll
  ),
  manageTags: anyOf(microsoftTeamsScopes.teamworkTagReadWrite),
  getPresence: anyOf(microsoftTeamsScopes.presenceReadAll),
  teamChange: teamRead,
  channelChange: channelRead,
  channelMessage: anyOf(microsoftTeamsScopes.channelMessageReadAll),
  chatMessage: chatRead,
  membershipChange: anyOf(microsoftTeamsScopes.teamMemberReadWriteAll)
} as const;
