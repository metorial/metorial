import { describe, expect, it } from 'vitest';
import { validateManageHotspotInput } from './hotspots';
import { validateManageIssueInput } from './issues';
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
