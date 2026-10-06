import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('VirusTotal tool input schemas', provider.actions);
describe('VirusTotal retained schema contracts', () => {
  it('retains all 14 legacy action keys, adds only context, and has no triggers', () => {
    const legacy = [
      'scan_file',
      'scan_url',
      'get_file_report',
      'get_url_report',
      'get_domain_report',
      'get_ip_report',
      'get_analysis_status',
      'add_comment',
      'get_comments',
      'add_vote',
      'get_relationships',
      'search_intelligence',
      'manage_livehunt_ruleset',
      'manage_retrohunt'
    ];
    expect(provider.actions.map(action => action.key).sort()).toEqual(
      [...legacy, 'get_connection_context'].sort()
    );
    expect(
      provider.actions.every(
        action => action.type === 'tool' && `virustotal-${action.key}`.length < 60
      )
    ).toBe(true);
  });
  it('keeps consolidated actions as one object with optional branch fields', () => {
    const hunt = provider.actions.find(action => action.key === 'manage_livehunt_ruleset')!;
    const retro = provider.actions.find(action => action.key === 'manage_retrohunt')!;
    expect(
      hunt.inputSchema.safeParse({ action: 'get', rulesetId: 'exact-native-id' }).success
    ).toBe(true);
    expect(
      hunt.inputSchema.safeParse({
        action: 'create',
        name: 'controlled',
        rules: 'rule controlled {condition:false}',
        enabled: false,
        notificationLimit: 0,
        notificationEmails: []
      }).success
    ).toBe(true);
    expect(
      retro.inputSchema.safeParse({ action: 'get_matches', jobId: 'exact-native-id' }).success
    ).toBe(true);
    expect(
      retro.inputSchema.safeParse({
        action: 'create',
        rules: 'rule controlled {condition:false}',
        corpus: 'goodware'
      }).success
    ).toBe(true);
  });
});
