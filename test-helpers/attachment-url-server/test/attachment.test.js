import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { GET } from '../api/attachment.js';

let previousToken;

before(() => {
  previousToken = process.env.ATTACHMENT_TEST_TOKEN;
  process.env.ATTACHMENT_TEST_TOKEN = 'test-secret';
});

after(() => {
  if (previousToken === undefined) {
    delete process.env.ATTACHMENT_TEST_TOKEN;
  } else {
    process.env.ATTACHMENT_TEST_TOKEN = previousToken;
  }
});

let request = ({ headerToken = 'test-secret', queryToken = 'test-secret', expiresAt }) =>
  new Request(
    `https://example.com/api/attachment?token=${encodeURIComponent(
      queryToken
    )}&expiresAt=${encodeURIComponent(expiresAt)}`,
    {
      headers: {
        'x-attachment-token': headerToken
      }
    }
  );

test('returns an attachment when both credentials are valid', async () => {
  let response = GET(request({ expiresAt: new Date(Date.now() + 60_000).toISOString() }));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-attachment-authenticated'), 'true');
  assert.match(await response.text(), /Authenticated attachment fetched at/);
});

test('rejects either invalid credential', () => {
  let expiresAt = new Date(Date.now() + 60_000).toISOString();
  let invalidHeader = GET(request({ headerToken: 'wrong', expiresAt }));
  let invalidQuery = GET(request({ queryToken: 'wrong', expiresAt }));

  assert.equal(invalidHeader.status, 401);
  assert.equal(invalidQuery.status, 401);
});

test('rejects an expired URL', () => {
  let response = GET(request({ expiresAt: new Date(Date.now() - 1_000).toISOString() }));

  assert.equal(response.status, 410);
});
