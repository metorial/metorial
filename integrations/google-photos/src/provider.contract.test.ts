import { createLocalSlateTestClient, expectSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { googlePhotosActionScopes } from './scopes';

describe('google-photos provider contract', () => {
  it('exposes the expected provider, tool, trigger, and auth surface', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'google-photos',
        name: 'Google Photos',
        description:
          "Upload, manage, and organize photos and videos in users' Google Photos libraries. Create and manage albums, search media items, and use the Picker API for secure photo selection."
      },
      toolIds: [
        'list_albums',
        'get_album',
        'create_album',
        'update_album',
        'manage_album_media',
        'add_album_enrichment',
        'get_media_item',
        'search_media_items',
        'update_media_item',
        'upload_media',
        'create_picker_session',
        'get_picker_session',
        'list_picked_media',
        'delete_picker_session'
      ],
      triggerIds: ['inbound_webhook'],
      authMethodIds: ['google_oauth'],
      tools: [
        { id: 'list_albums', readOnly: true },
        { id: 'get_album', readOnly: true },
        { id: 'get_media_item', readOnly: true },
        { id: 'search_media_items', readOnly: true },
        { id: 'get_picker_session', readOnly: true },
        { id: 'list_picked_media', readOnly: true },
        { id: 'delete_picker_session', destructive: true }
      ],
      triggers: [{ id: 'inbound_webhook', invocationType: 'webhook' }]
    });

    expect(contract.actions).toHaveLength(15);
    expect(Object.keys(contract.configSchema.properties ?? {})).toEqual([]);

    let expectedScopes = {
      list_albums: googlePhotosActionScopes.listAlbums,
      get_album: googlePhotosActionScopes.getAlbum,
      create_album: googlePhotosActionScopes.createAlbum,
      update_album: googlePhotosActionScopes.updateAlbum,
      manage_album_media: googlePhotosActionScopes.manageAlbumMedia,
      add_album_enrichment: googlePhotosActionScopes.addAlbumEnrichment,
      get_media_item: googlePhotosActionScopes.getMediaItem,
      search_media_items: googlePhotosActionScopes.searchMediaItems,
      update_media_item: googlePhotosActionScopes.updateMediaItem,
      upload_media: googlePhotosActionScopes.uploadMedia,
      create_picker_session: googlePhotosActionScopes.createPickerSession,
      get_picker_session: googlePhotosActionScopes.getPickerSession,
      list_picked_media: googlePhotosActionScopes.listPickedMedia,
      delete_picker_session: googlePhotosActionScopes.deletePickerSession,
      inbound_webhook: googlePhotosActionScopes.inboundWebhook
    };

    for (let [actionId, scopes] of Object.entries(expectedScopes)) {
      expect(contract.actions.find(action => action.id === actionId)?.scopes).toEqual(scopes);
    }

    let oauth = await client.getAuthMethod('google_oauth');
    expect(oauth.authenticationMethod.type).toBe('auth.oauth');
    expect(oauth.authenticationMethod.capabilities.handleTokenRefresh?.enabled).toBe(true);
    expect(oauth.authenticationMethod.capabilities.getProfile?.enabled).toBe(true);

    let scopeTitles = new Set(
      (oauth.authenticationMethod.scopes ?? []).map(scope => scope.title)
    );
    expect(scopeTitles.has('Library Read')).toBe(true);
    expect(scopeTitles.has('User Email')).toBe(true);
  });
});
