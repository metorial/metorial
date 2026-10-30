import { getRuntimeInfo, SlateConfig } from 'slates';
import { z } from 'zod';
import { metorialValidationError } from './lib/errors';

export let DEFAULT_API_URL = 'https://api.metorial.com';
export let DEFAULT_API_VERSION = 'mt_2026_01_01_magnetar';

let LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1']);

export let getMetorialApiUrl = () => {
  let metorial = getRuntimeInfo()?.metorial;
  let raw = metorial?.apiUrl ?? DEFAULT_API_URL;

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw metorialValidationError(`Invalid Metorial API URL: ${raw}`);
  }

  let allowsHttp =
    metorial?.environment === 'development' || LOCAL_HOSTNAMES.has(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && allowsHttp)) {
    throw metorialValidationError('Metorial API URL must use https.');
  }

  return url.toString().replace(/\/+$/, '');
};

export let config = SlateConfig.create(z.object({}));
