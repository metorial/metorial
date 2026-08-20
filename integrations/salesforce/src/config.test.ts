import { readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { config, normalizeSalesforceConfig, normalizeSalesforceCustomDomain } from './config';

let assertReviewedProviderResolution = () => {
  let require = createRequire(import.meta.url);
  let slatesEntry = realpathSync(require.resolve('slates'));
  let slatesPackageUrl = new URL('../../../packages/slates/package.json', import.meta.url);
  let slatesPackage = JSON.parse(readFileSync(fileURLToPath(slatesPackageUrl), 'utf8'));
  let providerEntry = realpathSync(
    createRequire(slatesPackageUrl).resolve('@slates/provider')
  );
  let providerPackage = JSON.parse(
    readFileSync(
      fileURLToPath(new URL('../../../packages/provider/package.json', import.meta.url)),
      'utf8'
    )
  );
  expect(slatesEntry).toBe(
    realpathSync(
      fileURLToPath(new URL('../../../packages/slates/dist/index.cjs', import.meta.url))
    )
  );
  expect(providerEntry).toBe(
    realpathSync(
      fileURLToPath(new URL('../../../packages/provider/dist/index.cjs', import.meta.url))
    )
  );
  expect(slatesPackage.version).toBe('1.0.0-rc.17');
  expect(slatesPackage.dependencies['@slates/provider']).toBe('1.0.0-rc.18');
  expect(providerPackage.version).toBe('1.0.0-rc.18');
};

describe('Salesforce config normalization', () => {
  it('defaults to production and preserves apiVersion', () => {
    assertReviewedProviderResolution();
    expect(normalizeSalesforceConfig({ apiVersion: 'v61.0' })).toEqual({
      apiVersion: 'v61.0',
      environment: 'production'
    });
  });

  it('clears customDomain outside custom environments', () => {
    expect(
      normalizeSalesforceConfig({
        apiVersion: 'v62.0',
        environment: 'sandbox',
        customDomain: 'acme.my'
      })
    ).toEqual({
      apiVersion: 'v62.0',
      environment: 'sandbox'
    });
  });

  it('requires customDomain for custom environments', () => {
    expect(() =>
      normalizeSalesforceConfig({
        apiVersion: 'v62.0',
        environment: 'custom'
      })
    ).toThrow('Salesforce customDomain is required');
  });

  it('rejects custom config without customDomain in the behavioral config hook', () => {
    expect(() =>
      config.handlers.configChanged?.({
        previousConfig: null,
        newConfig: {
          environment: 'custom',
          apiVersion: 'v62.0'
        }
      })
    ).toThrow('Salesforce customDomain is required');
  });

  it('normalizes customDomain input forms', () => {
    expect(normalizeSalesforceCustomDomain('acme')).toBe('acme.my.salesforce.com');
    expect(normalizeSalesforceCustomDomain('acme.my')).toBe('acme.my.salesforce.com');
    expect(normalizeSalesforceCustomDomain('Acme.My.Salesforce.Com')).toBe(
      'acme.my.salesforce.com'
    );
    expect(normalizeSalesforceCustomDomain('https://acme.my.salesforce.com/setup')).toBe(
      'acme.my.salesforce.com'
    );
  });
});
