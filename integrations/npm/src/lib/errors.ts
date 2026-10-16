import { buildApiServiceError, isApiErrorRecord } from 'slates';

export let npmApiError = (error: unknown, secrets: (string | undefined)[] = []) => {
  let scrub = (value: string) => {
    let clean = value
      .replace(/Bearer\s+[^\s"']+/gi, 'Bearer [redacted]')
      .replace(/npm_[A-Za-z0-9]+/g, '[redacted]');
    for (let secret of secrets) {
      if (secret) clean = clean.split(secret).join('[redacted]');
    }
    return clean;
  };
  // Extract the body from both Axios and the SDK's normalized HTTP errors, then
  // pass only safe details to the shared mapper so request credentials cannot leak.
  return buildApiServiceError(error, {
    providerLabel: 'npm',
    reason: 'npm_api_error',
    parent: {},
    extractResponse: (value, helpers) => helpers.getResponseWithBody(value),
    extractMessage: (value, helpers) => {
      let response = helpers.getResponseWithBody(value);
      let details: string[] = [];
      helpers.collectDetails(response?.data, details, {
        detailKeys: ['message', 'error', 'reason', 'code'],
        nestedKeys: ['error', 'errors']
      });
      return scrub(
        details.length ? details.slice(0, 5).join(' - ') : helpers.extractMessage(value)
      );
    },
    extractUpstreamCode: (_value, response) => {
      if (!isApiErrorRecord(response?.data)) return undefined;
      return typeof response.data.code === 'string' ? scrub(response.data.code) : undefined;
    }
  });
};
