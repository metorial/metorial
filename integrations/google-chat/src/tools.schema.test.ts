import {
  describeMcpCompatibleToolSchemas,
  getMcpCompatibleToolSchemaCases
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

const expectedToolIds = [
  'send_message',
  'list_messages',
  'search_messages',
  'search_conversations',
  'manage_space',
  'manage_member',
  'manage_message',
  'manage_reaction',
  'find_direct_message',
  'get_attachment',
  'download_attachment',
  'upload_attachment',
  'list_space_events',
  'get_space_read_state',
  'get_thread_read_state',
  'update_space_read_state',
  'get_space_notification_setting',
  'update_space_notification_setting',
  'list_sections',
  'list_section_items',
  'manage_section',
  'move_section_item',
  'list_custom_emojis',
  'get_custom_emoji',
  'manage_custom_emoji',
  'search_spaces_admin'
] as const;

describe('Google Chat MCP schema inventory', () => {
  it('checks one top-level object schema for every registered tool, in order', () => {
    let cases = getMcpCompatibleToolSchemaCases(provider.actions);
    let toolIds = cases.map(([toolId]) => toolId);

    expect(toolIds).toEqual(expectedToolIds);
    expect(new Set(toolIds).size).toBe(expectedToolIds.length);
  });
});

describeMcpCompatibleToolSchemas('Google Chat tool input schemas', provider.actions);
