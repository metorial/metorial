import { z } from 'zod';
import { Client } from './client';
import { fail, parse } from './validation';
export const receiptReference = z.object({
  expenseId: z.string().min(1),
  receiptId: z.string().min(1),
  fileIndex: z.number().int().nonnegative()
});
export const trustedReceiptUrl = (value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return fail('Brex returned an invalid receipt download address.');
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    url.hash ||
    !/(^|\.)s3([.-][a-z0-9-]+)?\.amazonaws\.com$/.test(url.hostname) ||
    url.pathname === '/'
  )
    fail('Brex returned an untrusted receipt download address.');
  return url;
};
export const receiptFile = async (token: string, reference: unknown) => {
  const ids = parse(receiptReference, reference);
  const requestedAt = Date.now();
  const expense = await new Client({ token }).getCardExpense(ids.expenseId, ['receipts']);
  const matches = expense.receipts?.filter(v => v.id === ids.receiptId) ?? [];
  if (matches.length !== 1)
    fail('The exact receipt could not be uniquely identified on this expense.');
  const urls = matches[0]!.download_uris;
  const value = urls?.[ids.fileIndex];
  if (!value) fail('The requested receipt file is not available.');
  const url = trustedReceiptUrl(value!);
  let expiry = requestedAt + 15 * 60 * 1000;
  const expires = url.searchParams.get('Expires');
  if (expires !== null) {
    if (!/^\d+$/.test(expires) || !Number.isSafeInteger(Number(expires)))
      fail('Receipt expiry is invalid.');
    expiry = Math.min(expiry, Number(expires) * 1000);
  }
  const signedAt = url.searchParams.get('X-Amz-Date'),
    duration = url.searchParams.get('X-Amz-Expires');
  if (signedAt !== null || duration !== null) {
    if (
      !signedAt ||
      !/^\d{8}T\d{6}Z$/.test(signedAt) ||
      !duration ||
      !/^\d+$/.test(duration) ||
      !Number.isSafeInteger(Number(duration)) ||
      Number(duration) <= 0
    )
      fail('Receipt signed expiry is invalid.');
    const date = `${signedAt!.slice(0, 4)}-${signedAt!.slice(4, 6)}-${signedAt!.slice(6, 8)}T${signedAt!.slice(9, 11)}:${signedAt!.slice(11, 13)}:${signedAt!.slice(13, 15)}Z`;
    const timestamp = Date.parse(date);
    if (
      !Number.isFinite(timestamp) ||
      new Date(timestamp).toISOString().slice(0, 19) !== date.slice(0, 19)
    )
      fail('Receipt signed date is invalid.');
    expiry = Math.min(expiry, timestamp + Number(duration) * 1000);
  }
  if (!Number.isFinite(expiry) || expiry <= Date.now() + 5000)
    fail(
      'Receipt download link is expired or too close to expiry. Request the receipt again.'
    );
  return {
    url: url.toString(),
    expiresAt: new Date(expiry - 5000).toISOString(),
    reference: ids
  };
};
