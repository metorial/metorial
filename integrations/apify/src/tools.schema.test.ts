import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { getRun } from './tools/get-run';

describeMcpCompatibleToolSchemas('Apify tool input schemas', provider.actions);

describe('Get Run input schema', () => {
  it('accepts a zero dataset item limit when dataset items are not requested', () => {
    expect(
      getRun.inputSchema.safeParse({
        runId: 'WyAIlki2dyyW2qdgp',
        includeLog: false,
        waitForFinish: 60,
        datasetItemsLimit: 0,
        datasetItemsOffset: 0,
        includeDatasetItems: false
      }).success
    ).toBe(true);
  });
});
