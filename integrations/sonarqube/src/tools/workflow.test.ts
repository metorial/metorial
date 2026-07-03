import { describe, expect, it } from 'vitest';
import { validateManageHotspotInput, validateSearchHotspotsInput } from './hotspots';
import { validateManageIssueInput } from './issues';
import { mapHotspot, mapIssue } from './shared';
import { sourceAttachmentMetadata, sourceTextFromShowResponse } from './source';

describe('SonarQube workflow tool helpers', () => {
  it('requires explicit confirmation before mutating issues', () => {
    expect(() =>
      validateManageIssueInput({
        issueKey: 'ISSUE-1',
        action: 'comment',
        comment: 'Reviewed'
      })
    ).toThrow(/confirmWrite/);

    expect(() =>
      validateManageIssueInput({
        issueKey: 'ISSUE-1',
        action: 'comment',
        comment: 'Reviewed',
        confirmWrite: true
      })
    ).not.toThrow();
  });

  it('rejects incompatible issue action fields', () => {
    expect(() =>
      validateManageIssueInput({
        issueKey: 'ISSUE-1',
        action: 'assign',
        assignee: 'developer',
        tags: ['triaged'],
        confirmWrite: true
      })
    ).toThrow(/tags/);

    expect(() =>
      validateManageIssueInput({
        issueKey: 'ISSUE-1',
        action: 'set_tags',
        tags: ['triaged'],
        confirmWrite: true
      })
    ).not.toThrow();
  });

  it('allows an empty issue tag list to clear tags explicitly', () => {
    expect(() =>
      validateManageIssueInput({
        issueKey: 'ISSUE-1',
        action: 'set_tags',
        tags: [],
        confirmWrite: true
      })
    ).not.toThrow();

    expect(() =>
      validateManageIssueInput({
        issueKey: 'ISSUE-1',
        action: 'set_tags',
        confirmWrite: true
      })
    ).toThrow(/tags/);
  });

  it('validates hotspot review status combinations', () => {
    expect(() =>
      validateManageHotspotInput({
        hotspotKey: 'HOTSPOT-1',
        status: 'REVIEWED',
        confirmWrite: true
      })
    ).toThrow(/resolution/);

    expect(() =>
      validateManageHotspotInput({
        hotspotKey: 'HOTSPOT-1',
        status: 'TO_REVIEW',
        resolution: 'SAFE',
        confirmWrite: true
      })
    ).toThrow(/resolution/);

    expect(() =>
      validateManageHotspotInput({
        hotspotKey: 'HOTSPOT-1',
        status: 'REVIEWED',
        resolution: 'SAFE',
        confirmWrite: true
      })
    ).not.toThrow();
  });

  it('validates deployment-specific hotspot resolutions', () => {
    expect(() =>
      validateManageHotspotInput(
        {
          hotspotKey: 'HOTSPOT-1',
          status: 'REVIEWED',
          resolution: 'ACKNOWLEDGED',
          confirmWrite: true
        },
        { deployment: 'server' }
      )
    ).not.toThrow();

    expect(() =>
      validateSearchHotspotsInput(
        {
          resolution: 'ACKNOWLEDGED'
        },
        { deployment: 'cloud' }
      )
    ).toThrow(/SonarQube Cloud/);
  });

  it('maps current issueStatus ahead of legacy issue status', () => {
    expect(
      mapIssue({
        key: 'ISSUE-1',
        issueStatus: 'ACCEPTED',
        status: 'RESOLVED'
      })
    ).toMatchObject({
      key: 'ISSUE-1',
      status: 'ACCEPTED'
    });
  });

  it('maps hotspot show responses with nested component, project, and rule objects', () => {
    expect(
      mapHotspot({
        key: 'HOTSPOT-1',
        component: { key: 'project:src/main/java/App.java' },
        project: { key: 'project' },
        rule: {
          key: 'java:S4787',
          vulnerabilityProbability: 'LOW'
        },
        status: 'TO_REVIEW'
      })
    ).toMatchObject({
      key: 'HOTSPOT-1',
      component: 'project:src/main/java/App.java',
      project: 'project',
      ruleKey: 'java:S4787',
      vulnerabilityProbability: 'LOW'
    });
  });

  it('builds source attachment content and metadata without inline file output fields', () => {
    let content = sourceTextFromShowResponse({
      sources: [
        { line: 1, code: 'let answer = 42;' },
        { line: 2, code: 'console.log(answer);' }
      ]
    });
    let metadata = sourceAttachmentMetadata(content);

    expect(content).toBe('let answer = 42;\nconsole.log(answer);');
    expect(metadata).toEqual({
      mimeType: 'text/plain',
      byteLength: Buffer.byteLength(content, 'utf8'),
      attachmentCount: 1
    });
  });
});
