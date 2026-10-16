import { createApiServiceError } from 'slates';

export let normalizeInstanceUrl = (value?: string) => {
  let url: URL;
  try {
    url = new URL(value ?? '');
  } catch (error) {
    throw createApiServiceError(
      'Provide the HTTPS origin of your Brightspace instance, such as https://school.brightspace.com.',
      { reason: 'brightspace_instance_url', parent: error }
    );
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  ) {
    throw createApiServiceError(
      'Provide the HTTPS origin of your Brightspace instance, such as https://school.brightspace.com.',
      { reason: 'brightspace_instance_url' }
    );
  }
  return url.origin;
};
