import { AuthConfigSecretRedactor, isApiErrorRecord } from 'slates';

// Best Buy echoes apiKey in canonical/product URLs. Preserve the other URL bytes,
// especially encoded cursor values, while removing only credential parameters.
let removeApiKeyParameter = (value: string) => {
  if (!/^(?:https?:\/\/|\/)/i.test(value)) return value;
  let question = value.indexOf('?');
  if (question < 0) return value;
  let hash = value.indexOf('#');
  if (hash >= 0 && hash < question) return value;
  let end = hash < 0 ? value.length : hash;
  let parameters = value.slice(question + 1, end).split('&');
  let safeParameters = parameters.filter(parameter => {
    let name = parameter.split('=', 1)[0] ?? '';
    try {
      return !/^api[-_]?key$/i.test(decodeURIComponent(name));
    } catch {
      return true;
    }
  });
  if (safeParameters.length === parameters.length) return value;
  let query = safeParameters.length > 0 ? `?${safeParameters.join('&')}` : '';
  return `${value.slice(0, question)}${query}${value.slice(end)}`;
};

export let createBestBuyResponseSanitizer = (token: string) => {
  let formEncodedToken = new URLSearchParams({ value: token }).toString().slice(6);
  let redactor = new AuthConfigSecretRedactor({
    token,
    encodedToken: encodeURIComponent(token),
    formEncodedToken
  });
  let text = (value: string) =>
    redactor
      .redactEmbedded(removeApiKeyParameter(value))
      .replace(
        /\$\$MT\$secret\$authConfig\$(?:token|encodedToken|formEncodedToken)(?:\$\$)?/g,
        '[redacted]'
      );
  let response = (value: unknown): unknown => {
    if (typeof value === 'string') return text(value);
    if (Array.isArray(value)) return value.map(response);
    if (isApiErrorRecord(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [text(key), response(item)])
      );
    }
    return value;
  };
  return { text, response };
};
