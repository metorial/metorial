import type { FreshBooksClient } from './client';

export let parseWebhookRequest = async (
  request: Request
): Promise<{
  isVerification: boolean;
  verifier?: string;
  verifyObjectId?: number;
  eventName: string;
  objectId: string;
  accountId: string;
  businessId: string;
  identityId: string;
}> => {
  let contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/x-www-form-urlencoded')) {
    let text = await request.text();
    let params = new URLSearchParams(text);

    return {
      isVerification: false,
      eventName: params.get('name') || '',
      objectId: params.get('object_id') || '',
      accountId: params.get('account_id') || '',
      businessId: params.get('business_id') || '',
      identityId: params.get('identity_id') || ''
    };
  }

  // JSON payloads are typically verification requests
  let data = (await request.json()) as any;
  if (data?.verifier) {
    return {
      isVerification: true,
      verifier: data.verifier,
      verifyObjectId: data.object_id,
      eventName: '',
      objectId: '',
      accountId: '',
      businessId: '',
      identityId: ''
    };
  }

  return {
    isVerification: false,
    eventName: '',
    objectId: '',
    accountId: '',
    businessId: '',
    identityId: ''
  };
};

export let handleWebhookVerification = async (
  client: FreshBooksClient,
  parsed: Awaited<ReturnType<typeof parseWebhookRequest>>
) => {
  if (parsed.isVerification && parsed.verifier && parsed.verifyObjectId) {
    await client.verifyWebhook(parsed.verifyObjectId, parsed.verifier);
  }
};
