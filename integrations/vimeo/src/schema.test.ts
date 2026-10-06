import {
  describeMcpCompatibleToolSchemas,
  getMcpCompatibleToolSchemaCases
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';

const legacy = [
  'get_video',
  'list_videos',
  'search_videos',
  'edit_video',
  'delete_video',
  'list_video_comments',
  'add_video_comment',
  'get_user',
  'list_liked_videos',
  'like_video',
  'list_showcases',
  'create_showcase',
  'edit_showcase',
  'delete_showcase',
  'list_showcase_videos',
  'manage_showcase_video',
  'list_folders',
  'create_folder',
  'delete_folder',
  'list_folder_videos',
  'manage_folder_video',
  'list_channels',
  'get_channel',
  'create_channel',
  'delete_channel',
  'list_channel_videos',
  'manage_channel_video',
  'list_categories',
  'list_category_videos'
];
describeMcpCompatibleToolSchemas('Vimeo tool schemas', provider);
describe('Vimeo compatibility contracts', () => {
  const tools = new Map(getMcpCompatibleToolSchemaCases(provider));
  it('preserves every legacy key and only the approved additions', () => {
    expect([...tools.keys()].filter(key => !key.startsWith('metorial$')).sort()).toEqual(
      [...legacy, 'get_folder', 'get_showcase', 'download_video'].sort()
    );
  });
  it('keeps production IDs below 60 characters', () => {
    for (const key of tools.keys()) expect(`vimeo-${key}`.length).toBeLessThan(60);
  });
  it('preserves optional legacy channel privacy and relationship action schemas', () => {
    const channel = z.toJSONSchema(tools.get('create_channel')!.inputSchema);
    expect(channel.required).not.toContain('privacy');
    for (const key of ['manage_folder_video', 'manage_showcase_video', 'manage_channel_video'])
      expect(JSON.stringify(z.toJSONSchema(tools.get(key)!.inputSchema))).toContain('remove');
  });
  it('preserves explicit empty replacements and false privacy values', () => {
    expect(
      tools.get('edit_video')!.inputSchema.safeParse({
        videoId: '1',
        tags: [],
        embedDomains: [],
        privacy: { download: false }
      }).success
    ).toBe(true);
  });
  it('retains legacy sort values alongside current native aliases', () => {
    expect(
      tools.get('list_showcases')!.inputSchema.safeParse({ sort: 'modified_time' }).success
    ).toBe(true);
    expect(
      tools.get('list_folders')!.inputSchema.safeParse({ sort: 'last_user_action_event_date' })
        .success
    ).toBe(true);
  });
});
