import { anyOf } from '@slates/provider';

export let youtubeScopes = {
  userinfoEmail: 'https://www.googleapis.com/auth/userinfo.email',
  userinfoProfile: 'https://www.googleapis.com/auth/userinfo.profile',
  youtube: 'https://www.googleapis.com/auth/youtube',
  youtubeReadonly: 'https://www.googleapis.com/auth/youtube.readonly',
  youtubeForceSsl: 'https://www.googleapis.com/auth/youtube.force-ssl',
  youtubeUpload: 'https://www.googleapis.com/auth/youtube.upload',
  youtubeChannelMembershipsCreator:
    'https://www.googleapis.com/auth/youtube.channel-memberships.creator',
  youtubepartner: 'https://www.googleapis.com/auth/youtubepartner',
  youtubepartnerChannelAudit: 'https://www.googleapis.com/auth/youtubepartner-channel-audit'
} as const;

let youtubeRead = anyOf(
  youtubeScopes.youtubeReadonly,
  youtubeScopes.youtube,
  youtubeScopes.youtubeForceSsl,
  youtubeScopes.youtubepartner,
  youtubeScopes.youtubepartnerChannelAudit
);

let youtubeWrite = anyOf(
  youtubeScopes.youtube,
  youtubeScopes.youtubeForceSsl,
  youtubeScopes.youtubeUpload
);

export let youtubeActionScopes = {
  searchContent: youtubeRead,
  listVideos: youtubeRead,
  getVideo: youtubeRead,
  getChannel: youtubeRead,
  listPlaylists: youtubeRead,
  listMetadata: youtubeRead,
  listComments: youtubeRead,
  listActivities: youtubeRead,
  listCaptions: anyOf(
    youtubeScopes.youtubeReadonly,
    youtubeScopes.youtube,
    youtubeScopes.youtubeForceSsl
  ),
  uploadVideo: anyOf(
    youtubeScopes.youtubeUpload,
    youtubeScopes.youtube,
    youtubeScopes.youtubeForceSsl,
    youtubeScopes.youtubepartner
  ),
  setThumbnail: anyOf(
    youtubeScopes.youtubeUpload,
    youtubeScopes.youtube,
    youtubeScopes.youtubeForceSsl,
    youtubeScopes.youtubepartner
  ),
  downloadCaption: anyOf(youtubeScopes.youtubeForceSsl, youtubeScopes.youtubepartner),
  getVideoRating: anyOf(
    youtubeScopes.youtube,
    youtubeScopes.youtubeForceSsl,
    youtubeScopes.youtubepartner
  ),
  updateVideo: youtubeWrite,
  deleteVideo: youtubeWrite,
  rateVideo: youtubeWrite,
  updateChannel: youtubeWrite,
  managePlaylist: youtubeWrite,
  managePlaylistItems: youtubeWrite,
  manageComments: youtubeWrite,
  manageSubscriptions: youtubeWrite,
  channelActivity: youtubeRead,
  newVideo: youtubeRead,
  inboundWebhook: youtubeRead
} as const;
