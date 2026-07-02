import { badRequestError, ServiceError } from '@lowerdeck/error';

export let oneOfRequiredError = (message: string, fields: [string, string, ...string[]]) =>
  new ServiceError(
    badRequestError({
      message,
      errors: fields.map(field => ({
        path: [field],
        code: 'missing_required_alternative',
        message
      }))
    })
  );
