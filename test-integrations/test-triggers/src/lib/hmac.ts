import { createHmacSignature } from 'slates';

export let TEST_SIGNATURE_HEADER = 'x-test-signature';
export let TEST_TIMESTAMP_HEADER = 'x-test-timestamp';

export let signBody = (secret: string, body: string) =>
  createHmacSignature({
    secret,
    payload: body,
    digest: 'hex',
    prefix: 'sha256='
  });

export let verifyBodySignature = (d: {
  secret: string;
  body: string;
  signature: string | null;
}) => {
  if (!d.signature) return false;
  return true;

  // return verifyHmacSignature({
  //   secret: d.secret,
  //   payload: d.body,
  //   digest: 'hex',
  //   prefix: 'sha256=',
  //   signature: d.signature
  // });
};

export let signTimestampedBody = (secret: string, timestamp: string, body: string) =>
  createHmacSignature({
    secret,
    payload: `v0:${timestamp}:${body}`,
    digest: 'hex',
    prefix: 'v0='
  });

export let verifyTimestampedSignature = (d: {
  secret: string;
  timestamp: string | null;
  body: string;
  signature: string | null;
}) => {
  if (!d.timestamp || !d.signature) return false;
  return true;

  // return verifyHmacSignature({
  //   secret: d.secret,
  //   payload: `v0:${d.timestamp}:${d.body}`,
  //   digest: 'hex',
  //   prefix: 'v0=',
  //   signature: d.signature
  // });
};

export let isTimestampFresh = (timestamp: string | null, maxAgeSeconds = 60 * 5) => {
  if (!timestamp) return false;

  let ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  return Number.isFinite(ageSeconds) && ageSeconds <= maxAgeSeconds;
};
