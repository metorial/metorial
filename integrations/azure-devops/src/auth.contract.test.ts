import { describe, expect, it } from 'vitest';
import { auth } from './auth';

let expectedScopes = [
  'vso.profile',
  'vso.project',
  'vso.work_write',
  'vso.code_manage',
  'vso.build_execute',
  'vso.wiki_write',
  'vso.hooks_write'
];

let removedScopes = [
  'vso.identity',
  'vso.project_manage',
  'vso.release_manage',
  'vso.work',
  'vso.work_full',
  'vso.code',
  'vso.code_write',
  'vso.build',
  'vso.wiki'
];

let sorted = (values: string[]) => [...values].sort();

describe('azure-devops auth scope contract', () => {
  let methods = auth.authStack.filter(method => method.type === 'auth.oauth');

  it('exposes the two OAuth methods', () => {
    expect(methods.map(method => method.key)).toEqual(['oauth_common', 'oauth_organizations']);
  });

  it('requests exactly the trimmed scope set on every OAuth method', () => {
    for (let method of methods) {
      let offered = method.scopes.map(entry => entry.scope);
      expect(sorted(offered), method.key).toEqual(sorted(expectedScopes));
    }
  });

  it('no longer offers removed scopes on any method', () => {
    for (let method of methods) {
      let offered = method.scopes.map(entry => entry.scope);
      for (let scope of removedScopes) {
        expect(offered, `${scope} was removed in the trim (${method.key})`).not.toContain(
          scope
        );
      }
    }
  });

  it('keeps vso.hooks_write for the service-hook triggers', () => {
    for (let method of methods) {
      expect(method.scopes.map(entry => entry.scope)).toContain('vso.hooks_write');
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
