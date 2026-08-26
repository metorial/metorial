import { describe, expect, it } from 'vitest';
import {
  auth,
  GRANULAR_CUSTOM_CONNECTION_SCOPES,
  LEGACY_CUSTOM_CONNECTION_SCOPES
} from './auth';

let expectedScopes = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'accounting.invoices',
  'accounting.payments',
  'accounting.banktransactions',
  'accounting.manualjournals',
  'accounting.contacts',
  'accounting.settings',
  'accounting.reports.aged.read',
  'accounting.reports.balancesheet.read',
  'accounting.reports.banksummary.read',
  'accounting.reports.budgetsummary.read',
  'accounting.reports.executivesummary.read',
  'accounting.reports.profitandloss.read',
  'accounting.reports.trialbalance.read',
  'accounting.reports.tenninetynine.read'
];

describe('xero auth scope contract', () => {
  let oauth = auth.authStack.find(method => method.type === 'auth.oauth');

  it('requests exactly the scopes required by the OAuth flow and registered tools', () => {
    expect(oauth).toBeDefined();
    expect(oauth?.scopes.map(entry => entry.scope)).toEqual(expectedScopes);
  });

  it('does not rely on defaultChecked because production requests every declared scope', () => {
    expect(oauth).toBeDefined();
    for (let entry of oauth?.scopes ?? []) {
      expect(entry.defaultChecked, entry.scope).toBeUndefined();
    }
  });

  it('requests the report scopes used by live scenarios for custom connections', () => {
    let reportScopes = [
      'accounting.reports.budgetsummary.read',
      'accounting.reports.tenninetynine.read'
    ];

    expect(GRANULAR_CUSTOM_CONNECTION_SCOPES.split(' ')).toEqual(
      expect.arrayContaining(reportScopes)
    );
    expect(LEGACY_CUSTOM_CONNECTION_SCOPES.split(' ')).toContain(
      'accounting.reports.tenninetynine.read'
    );
  });
});
