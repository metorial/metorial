import { Slate } from 'slates';
import { spec } from './spec';
import {
  createComment,
  createPlaylist,
  deletePlaylist,
  deleteTrack,
  followUser,
  getMyProfile,
  getOEmbed,
  getPlaylist,
  getTrack,
  getTrackComments,
  getUser,
  getUserFollowers,
  getUserFollowings,
  getUserPlaylists,
  getUserTracks,
  likePlaylist,
  likeTrack,
  repostPlaylist,
  repostTrack,
  resolveUrl,
  searchPlaylists,
  searchTracks,
  searchUsers,
  updatePlaylist,
  updateTrack,
  uploadTrack
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    searchTracks,
    searchPlaylists,
    searchUsers,
    getTrack,
    uploadTrack,
    updateTrack,
    deleteTrack,
    getPlaylist,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    getUser,
    getMyProfile,
    getUserTracks,
    getUserPlaylists,
    getUserFollowers,
    getUserFollowings,
    likeTrack,
    repostTrack,
    likePlaylist,
    repostPlaylist,
    followUser,
    getTrackComments,
    createComment,
    resolveUrl,
    getOEmbed
  ],
  triggers: [inboundWebhook]
});
