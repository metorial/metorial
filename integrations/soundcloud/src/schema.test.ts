import {
  describeMcpCompatibleToolSchemas,
  getMcpCompatibleToolSchemaCases
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { z } from './lib/native';

describeMcpCompatibleToolSchemas('SoundCloud input schemas', provider);
describe('SoundCloud retained contracts', () => {
  const tools = new Map(getMcpCompatibleToolSchemaCases(provider));
  it('retains exactly all 26 legacy public keys', () =>
    expect([...tools.keys()].sort()).toEqual(
      [
        'search_tracks',
        'search_playlists',
        'search_users',
        'get_track',
        'upload_track',
        'update_track',
        'delete_track',
        'get_playlist',
        'create_playlist',
        'update_playlist',
        'delete_playlist',
        'get_user',
        'get_my_profile',
        'get_user_tracks',
        'get_user_playlists',
        'get_user_followers',
        'get_user_followings',
        'like_track',
        'repost_track',
        'like_playlist',
        'repost_playlist',
        'follow_user',
        'get_track_comments',
        'create_comment',
        'resolve_url',
        'get_oembed'
      ].sort()
    ));
  it('keeps every production ID under 60 characters', () => {
    for (const key of tools.keys()) expect(`soundcloud-${key}`.length).toBeLessThan(60);
  });
  it('preserves numeric ID string inputs and original base64/album/relationship fields', () => {
    for (const [key, fields] of [
      ['get_track', ['trackId', 'includeStreams']],
      ['upload_track', ['assetData', 'assetFilename', 'artworkData']],
      ['update_playlist', ['trackIds', 'isAlbum']],
      ['like_track', ['unlike']],
      ['follow_user', ['unfollow']]
    ] as const) {
      const schema = z.toJSONSchema(tools.get(key)!.inputSchema);
      expect(schema.type).toBe('object');
      for (const field of fields) expect(JSON.stringify(schema)).toContain(`"${field}"`);
    }
  });
  it('keeps file delivery and pagination additive within existing tools', () => {
    expect(JSON.stringify(z.toJSONSchema(tools.get('get_track')!.inputSchema))).toContain(
      'download'
    );
    expect(JSON.stringify(z.toJSONSchema(tools.get('search_tracks')!.inputSchema))).toContain(
      'nextHref'
    );
  });
});
