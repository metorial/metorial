import { describe, expect, it } from 'vitest';
import { auth } from './auth';

let expectedScopes = ['vso.code_manage', 'vso.profile'];

let sorted = (values: string[]) => [...values].sort();

describe('azure-repos auth scope contract', () => {
  let methods = auth.authStack.filter(method => method.type === 'auth.oauth');

  it('exposes the two OAuth methods', () => {
    expect(methods.map(method => method.key)).toEqual(['oauth_common', 'oauth_organizations']);
  });

  it('requests the configured scope set on every OAuth method', () => {
    for (let method of methods) {
      let offered = method.scopes.map(entry => entry.scope);
      expect(sorted(offered), method.key).toEqual(sorted(expectedScopes));
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
