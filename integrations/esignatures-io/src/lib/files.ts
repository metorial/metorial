import { createApiServiceError } from 'slates';

// Query Contract returns a new signed PDF URL with a three-day lifetime.
// Refresh one hour early to avoid serving a link close to expiration.
let PDF_REFRESH_AFTER_MS = 71 * 60 * 60 * 1000;

export let getSignedPdfDetails = (contract: { contractPdfUrl?: string }) => {
  if (!contract.contractPdfUrl) {
    throw createApiServiceError(
      'The signed PDF is not available. The contract must be fully signed.'
    );
  }
  return {
    url: contract.contractPdfUrl,
    expiresAt: new Date(Date.now() + PDF_REFRESH_AFTER_MS).toISOString()
  };
};
