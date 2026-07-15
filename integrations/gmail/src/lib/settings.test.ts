import { describe, expect, it } from 'vitest';
import { mergeImapSettingsUpdate, mergePopSettingsUpdate } from './settings';

describe('Gmail settings update merging', () => {
  it('overlays caller-provided IMAP fields on the current settings', () => {
    let merged = mergeImapSettingsUpdate(
      {
        enabled: true,
        autoExpunge: false,
        expungeBehavior: 'archive',
        maxFolderSize: 5000
      },
      { enabled: false, maxFolderSize: 1000 }
    );

    expect(merged).toEqual({
      enabled: false,
      autoExpunge: false,
      expungeBehavior: 'archive',
      maxFolderSize: 1000
    });
  });

  it('omits an unspecified IMAP expunge behavior instead of echoing it back', () => {
    let merged = mergeImapSettingsUpdate(
      {
        enabled: true,
        autoExpunge: false,
        expungeBehavior: 'expungeBehaviorUnspecified',
        maxFolderSize: 0
      },
      { enabled: false }
    );

    expect(merged).toEqual({
      enabled: false,
      autoExpunge: false,
      maxFolderSize: 0
    });
    expect('expungeBehavior' in merged).toBe(false);
  });

  it('keeps a caller-provided expunge behavior over an unspecified current value', () => {
    let merged = mergeImapSettingsUpdate(
      {
        enabled: true,
        autoExpunge: false,
        expungeBehavior: 'expungeBehaviorUnspecified',
        maxFolderSize: 0
      },
      { expungeBehavior: 'trash' }
    );

    expect(merged.expungeBehavior).toBe('trash');
  });

  it('overlays caller-provided POP fields on the current settings', () => {
    let merged = mergePopSettingsUpdate(
      { accessWindow: 'allMail', disposition: 'leaveInInbox' },
      { disposition: 'archive' }
    );

    expect(merged).toEqual({ accessWindow: 'allMail', disposition: 'archive' });
  });

  it('omits unspecified POP access window and disposition instead of echoing them back', () => {
    let merged = mergePopSettingsUpdate(
      {
        accessWindow: 'accessWindowUnspecified',
        disposition: 'dispositionUnspecified'
      },
      { accessWindow: 'fromNowOn' }
    );

    expect(merged).toEqual({ accessWindow: 'fromNowOn' });
    expect('disposition' in merged).toBe(false);
  });
});
