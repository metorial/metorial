import { createLocalSlateTestClient, expectSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { youtubeActionScopes, youtubeScopes } from './scopes';

describe('youtube provider contract', () => {
  it('exposes the expected provider, tool, trigger, and auth surface', async () => {
    let client = createLocalSlateTestClient({ slate: provider as any });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'youtube',
        name: 'YouTube',
        description:
          'Video-sharing platform with APIs for managing videos, channels, playlists, comments, captions, subscriptions, and live streams.'
      },
      toolIds: [
        'search_content',
        'list_videos',
        'get_video',
        'get_video_rating',
        'upload_video',
        'update_video',
        'delete_video',
        'rate_video',
        'get_channel',
        'update_channel',
        'manage_playlist',
        'list_playlists',
        'list_metadata',
        'manage_playlist_items',
        'manage_comments',
        'list_comments',
        'manage_subscriptions',
        'list_captions',
        'download_caption',
        'set_thumbnail',
        'list_activities'
      ],
      triggerIds: ['inbound_webhook', 'channel_activity', 'new_video'],
      authMethodIds: ['oauth2', 'api_key'],
      tools: [
        { id: 'search_content', readOnly: true, destructive: false },
        { id: 'list_videos', readOnly: true, destructive: false },
        { id: 'get_video', readOnly: true, destructive: false },
        { id: 'get_video_rating', readOnly: true, destructive: false },
        { id: 'upload_video', readOnly: false, destructive: false },
        { id: 'update_video', readOnly: false, destructive: false },
        { id: 'delete_video', readOnly: false, destructive: true },
        { id: 'get_channel', readOnly: true, destructive: false },
        { id: 'update_channel', readOnly: false, destructive: false },
        { id: 'list_playlists', readOnly: true, destructive: false },
        { id: 'list_metadata', readOnly: true, destructive: false },
        { id: 'list_comments', readOnly: true, destructive: false },
        { id: 'list_activities', readOnly: true, destructive: false },
        { id: 'download_caption', readOnly: true, destructive: false },
        { id: 'set_thumbnail', readOnly: false, destructive: false }
      ],
      triggers: [
        { id: 'inbound_webhook', invocationType: 'webhook' },
        { id: 'channel_activity', invocationType: 'polling' },
        { id: 'new_video', invocationType: 'polling' }
      ]
    });

    expect(contract.actions).toHaveLength(24);
    expect(Object.keys(contract.configSchema.properties ?? {})).toEqual([]);

    let expectedScopes = {
      search_content: youtubeActionScopes.searchContent,
      list_videos: youtubeActionScopes.listVideos,
      get_video: youtubeActionScopes.getVideo,
      get_video_rating: youtubeActionScopes.getVideoRating,
      upload_video: youtubeActionScopes.uploadVideo,
      update_video: youtubeActionScopes.updateVideo,
      delete_video: youtubeActionScopes.deleteVideo,
      rate_video: youtubeActionScopes.rateVideo,
      get_channel: youtubeActionScopes.getChannel,
      update_channel: youtubeActionScopes.updateChannel,
      manage_playlist: youtubeActionScopes.managePlaylist,
      list_playlists: youtubeActionScopes.listPlaylists,
      list_metadata: youtubeActionScopes.listMetadata,
      manage_playlist_items: youtubeActionScopes.managePlaylistItems,
      manage_comments: youtubeActionScopes.manageComments,
      list_comments: youtubeActionScopes.listComments,
      manage_subscriptions: youtubeActionScopes.manageSubscriptions,
      list_captions: youtubeActionScopes.listCaptions,
      download_caption: youtubeActionScopes.downloadCaption,
      set_thumbnail: youtubeActionScopes.setThumbnail,
      list_activities: youtubeActionScopes.listActivities,
      channel_activity: youtubeActionScopes.channelActivity,
      new_video: youtubeActionScopes.newVideo,
      inbound_webhook: youtubeActionScopes.inboundWebhook
    };

    for (let [actionId, scopes] of Object.entries(expectedScopes)) {
      expect(contract.actions.find(action => action.id === actionId)?.scopes).toEqual(scopes);
    }

    let oauth = await client.getAuthMethod('oauth2');
    expect(oauth.authenticationMethod.type).toBe('auth.oauth');
    expect(oauth.authenticationMethod.capabilities.handleTokenRefresh?.enabled).toBe(true);
    expect(oauth.authenticationMethod.capabilities.getProfile?.enabled).toBe(true);

    let apiKey = await client.getAuthMethod('api_key');
    expect(apiKey.authenticationMethod.type).toBe('auth.token');

    let scopeTitles = new Set(
      (oauth.authenticationMethod.scopes ?? []).map(scope => scope.title)
    );
    expect(scopeTitles.has('Manage Account')).toBe(true);
    expect(scopeTitles.has('Read Only')).toBe(true);
    expect(scopeTitles.has('Upload Videos')).toBe(true);
    expect(
      (oauth.authenticationMethod.scopes ?? []).some(
        scope => scope.id === youtubeScopes.youtubeUpload
      )
    ).toBe(true);
    expect(
      (oauth.authenticationMethod.scopes ?? []).filter(scope =>
        [youtubeScopes.userinfoEmail, youtubeScopes.userinfoProfile].includes(
          scope.id as typeof youtubeScopes.userinfoEmail
        )
      )
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: youtubeScopes.userinfoEmail, defaultChecked: true }),
        expect.objectContaining({ id: youtubeScopes.userinfoProfile, defaultChecked: true })
      ])
    );
  });
});
