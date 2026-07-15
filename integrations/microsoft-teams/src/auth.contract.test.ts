import { describe, expect, it } from 'vitest';
import { auth } from './auth';
import { microsoftTeamsScopes } from './scopes';

// Delegated Microsoft Graph permissions flagged "admin consent required"
// (work/school accounts). Every declared scope is requested in production, so
// any one of these on a method walls every non-admin user with "Need admin
// approval" — they may only appear on the dedicated full-access method.
// Verified against learn.microsoft.com/en-us/graph/permissions-reference,
// 2026-07-15.
let adminConsentScopes = [
  microsoftTeamsScopes.teamSettingsReadWriteAll,
  microsoftTeamsScopes.channelCreate,
  microsoftTeamsScopes.channelSettingsReadWriteAll,
  microsoftTeamsScopes.channelDeleteAll,
  microsoftTeamsScopes.channelMessageReadAll,
  microsoftTeamsScopes.teamMemberReadWriteAll,
  microsoftTeamsScopes.channelMemberReadWriteAll,
  microsoftTeamsScopes.teamworkTagReadWrite,
  microsoftTeamsScopes.groupReadWriteAll,
  microsoftTeamsScopes.scheduleReadWriteAll
];

let userConsentableScopes = [
  microsoftTeamsScopes.userRead,
  microsoftTeamsScopes.offlineAccess,
  microsoftTeamsScopes.teamReadBasicAll,
  microsoftTeamsScopes.teamCreate,
  microsoftTeamsScopes.channelReadBasicAll,
  microsoftTeamsScopes.chatReadWrite,
  microsoftTeamsScopes.channelMessageSend,
  microsoftTeamsScopes.onlineMeetingsReadWrite,
  microsoftTeamsScopes.presenceReadAll
];

// Removed in the 2026-07 de-escalation (unused or subsumed); re-adding any of
// them to a consent list re-triggers the admin-approval wall or inflates the
// consent screen, so don't do it casually.
let removedScopes = [
  'Directory.Read.All',
  'GroupMember.Read.All',
  'GroupMember.ReadWrite.All',
  'TeamSettings.Read.All',
  'Chat.Read',
  'ChatMessage.Read',
  'ChatMessage.Send',
  'OnlineMeetings.Read',
  'Schedule.Read.All'
];

let sorted = (values: string[]) => [...values].sort();

describe('microsoft-teams auth scope contract', () => {
  let methods = auth.authStack.filter(method => method.type === 'auth.oauth');
  let standardMethods = methods.filter(method => method.key !== 'oauth_organizations_full');
  let fullMethod = methods.find(method => method.key === 'oauth_organizations_full');

  it('exposes the standard and full-access OAuth methods', () => {
    expect(methods.map(method => method.key)).toEqual([
      'oauth_common',
      'oauth_organizations',
      'oauth_organizations_full'
    ]);
  });

  it('requests only user-consentable scopes on the standard methods', () => {
    for (let method of standardMethods) {
      let offered = method.scopes.map(entry => entry.scope);
      expect(sorted(offered), method.key).toEqual(sorted(userConsentableScopes));

      for (let scope of adminConsentScopes) {
        expect(
          offered,
          `${method.key} must not request admin-consent scope ${scope}`
        ).not.toContain(scope);
      }
    }
  });

  it('requests the full scope set on the full-access method', () => {
    expect(fullMethod).toBeDefined();
    let offered = fullMethod!.scopes.map(entry => entry.scope);
    expect(sorted(offered)).toEqual(sorted([...userConsentableScopes, ...adminConsentScopes]));
  });

  it('no longer offers removed scopes on any method', () => {
    for (let method of methods) {
      let offered = method.scopes.map(entry => entry.scope);
      for (let scope of removedScopes) {
        expect(
          offered,
          `${scope} was removed in the de-escalation (${method.key})`
        ).not.toContain(scope);
      }
    }
  });

  it('does not rely on defaultChecked (CLI-only; production requests all declared scopes)', () => {
    for (let method of methods) {
      for (let entry of method.scopes) {
        expect(
          entry.defaultChecked,
          `${method.key}/${entry.scope} must not carry defaultChecked`
        ).toBeUndefined();
      }
    }
  });
});
