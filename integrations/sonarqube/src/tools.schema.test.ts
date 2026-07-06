import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('SonarQube tool input schemas', provider.actions);

describe('SonarQube search issue schema', () => {
  let searchIssuesTool = provider.actions.find(action => action.key === 'search_issues');

  it('rejects unsupported security hotspot issue types', () => {
    let result = searchIssuesTool?.inputSchema.safeParse({
      types: ['SECURITY_HOTSPOT']
    });

    expect(result?.success).toBe(false);
  });

  it('accepts current issue status and software-quality filters', () => {
    let result = searchIssuesTool?.inputSchema.safeParse({
      types: ['VULNERABILITY'],
      issueStatuses: ['OPEN'],
      impactSoftwareQualities: ['SECURITY'],
      impactSeverities: ['HIGH'],
      severities: ['HIGH'],
      files: ['app:src/main.ts']
    });

    expect(result?.success).toBe(true);
  });

  it('accepts legacy issue severities for compatibility', () => {
    let result = searchIssuesTool?.inputSchema.safeParse({
      severities: ['MAJOR']
    });

    expect(result?.success).toBe(true);
  });
});

describe('SonarQube manage issue schema', () => {
  let manageIssueTool = provider.actions.find(action => action.key === 'manage_issue');

  it('accepts official issue transition status values', () => {
    let result = manageIssueTool?.inputSchema.safeParse({
      issueKey: 'ISSUE-1',
      action: 'transition',
      transition: 'accept',
      confirmWrite: true
    });

    expect(result?.success).toBe(true);
  });

  it('rejects unsupported issue transition values', () => {
    let result = manageIssueTool?.inputSchema.safeParse({
      issueKey: 'ISSUE-1',
      action: 'transition',
      transition: 'confirm',
      confirmWrite: true
    });

    expect(result?.success).toBe(false);
  });
});

describe('SonarQube security hotspot schema', () => {
  let searchHotspotsTool = provider.actions.find(action => action.key === 'search_hotspots');
  let manageHotspotTool = provider.actions.find(action => action.key === 'manage_hotspot');

  it('accepts hotspot-key-only search input', () => {
    let result = searchHotspotsTool?.inputSchema.safeParse({
      hotspotKeys: ['HOTSPOT-1']
    });

    expect(result?.success).toBe(true);
  });

  it('accepts ACKNOWLEDGED hotspot resolution', () => {
    let result = manageHotspotTool?.inputSchema.safeParse({
      hotspotKey: 'HOTSPOT-1',
      status: 'REVIEWED',
      resolution: 'ACKNOWLEDGED',
      confirmWrite: true
    });

    expect(result?.success).toBe(true);
  });
});

describe('SonarQube duplicated file search schema', () => {
  let searchDuplicatedFilesTool = provider.actions.find(
    action => action.key === 'search_duplicated_files'
  );

  it('accepts project and branch inputs', () => {
    let result = searchDuplicatedFilesTool?.inputSchema.safeParse({
      projectKey: 'app',
      branch: 'main',
      pageSize: 10
    });

    expect(result?.success).toBe(true);
  });
});
