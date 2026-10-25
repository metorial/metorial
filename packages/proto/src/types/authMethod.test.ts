import { describe, expect, it } from 'vitest';
import { slatesAuthenticationMethod } from './authMethod';

let authMethod = {
  id: 'oauth',
  name: 'OAuth',
  type: 'auth.oauth',
  inputSchema: {},
  outputSchema: {},
  docs: []
};

describe('slatesAuthenticationMethod', () => {
  it('parses the adminSetup capability with and without the required flag', () => {
    for (let adminSetup of [
      { enabled: true },
      { enabled: true, required: false },
      { enabled: true, required: true }
    ]) {
      let parsed = slatesAuthenticationMethod.parse({
        ...authMethod,
        capabilities: { adminSetup }
      });
      expect(parsed.capabilities.adminSetup).toEqual(adminSetup);
    }
  });

  it('rejects a non-boolean required flag', () => {
    expect(
      slatesAuthenticationMethod.safeParse({
        ...authMethod,
        capabilities: { adminSetup: { enabled: true, required: 'yes' } }
      }).success
    ).toBe(false);
  });
});
