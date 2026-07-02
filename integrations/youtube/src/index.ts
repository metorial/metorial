import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  deleteVideo,
  getChannel,
  getVideo,
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
  updateChannel,
  updateVideo
} from './tools';
import { channelActivity, inboundWebhook, newVideo } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    searchContent,
    listVideos,
    getVideo,
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
    listActivities
  ],
  triggers: [inboundWebhook, channelActivity, newVideo]
});
