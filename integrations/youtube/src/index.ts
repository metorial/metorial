import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  deleteVideo,
  downloadCaption,
  getChannel,
  getVideo,
  getVideoRating,
  listActivities,
  listCaptions,
  listComments,
  listMetadata,
  listPlaylists,
  listVideos,
  manageComments,
  managePlaylist,
  managePlaylistItems,
  manageSubscriptions,
  rateVideo,
  searchContent,
  setThumbnail,
  updateChannel,
  updateVideo,
  uploadVideo
} from './tools';
import { channelActivity, inboundWebhook, newVideo } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    searchContent,
    listVideos,
    getVideo,
    getVideoRating,
    uploadVideo,
    updateVideo,
    deleteVideo,
    rateVideo,
    getChannel,
    updateChannel,
    managePlaylist,
    listPlaylists,
    listMetadata,
    managePlaylistItems,
    manageComments,
    listComments,
    manageSubscriptions,
    listCaptions,
    downloadCaption,
    setThumbnail,
    listActivities
  ],
  triggers: [inboundWebhook, channelActivity, newVideo]
});
