import { Slate } from 'slates';
import { spec } from './spec';
import {
  controlPlayback,
  getAlbum,
  getArtist,
  getRecentlyPlayed,
  getTopItems,
  getTrack,
  getUserProfile,
  manageFollowing,
  manageLibrary,
  managePlaylist,
  searchCatalog
} from './tools';
import { inboundWebhook, recentlyPlayedTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    searchCatalog.build(),
    getArtist.build(),
    getAlbum.build(),
    getTrack.build(),
    managePlaylist.build(),
    controlPlayback.build(),
    manageLibrary.build(),
    getUserProfile.build(),
    getTopItems.build(),
    manageFollowing.build(),
    getRecentlyPlayed.build()
  ],
  triggers: [inboundWebhook, recentlyPlayedTrigger.build()]
});
