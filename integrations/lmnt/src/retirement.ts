import { createApiServiceError } from 'slates';

export const lmntShutdownNotice =
  'LMNT has shut down its speech generation service. This integration is retired. Choose another speech provider. See https://docs.lmnt.com/.';

export const lmntShutdownError = () =>
  createApiServiceError(lmntShutdownNotice, { reason: 'lmnt_shutdown' });
