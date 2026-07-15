import type { ImapSettings, PopSettings } from './client';

// Gmail can return *Unspecified enum placeholders from the settings read
// endpoints but rejects them on update. The merge helpers below combine the
// caller's partial update with the current settings and omit any key whose
// merged value is such a placeholder so it is never echoed back on PUT.

export let mergeImapSettingsUpdate = (
  current: ImapSettings,
  update: Partial<ImapSettings>
): Partial<ImapSettings> => {
  let expungeBehavior = update.expungeBehavior ?? current.expungeBehavior;

  return {
    enabled: update.enabled ?? current.enabled,
    autoExpunge: update.autoExpunge ?? current.autoExpunge,
    ...(expungeBehavior !== 'expungeBehaviorUnspecified' ? { expungeBehavior } : {}),
    maxFolderSize: update.maxFolderSize ?? current.maxFolderSize
  };
};

export let mergePopSettingsUpdate = (
  current: PopSettings,
  update: Partial<PopSettings>
): Partial<PopSettings> => {
  let accessWindow = update.accessWindow ?? current.accessWindow;
  let disposition = update.disposition ?? current.disposition;

  return {
    ...(accessWindow !== 'accessWindowUnspecified' ? { accessWindow } : {}),
    ...(disposition !== 'dispositionUnspecified' ? { disposition } : {})
  };
};
