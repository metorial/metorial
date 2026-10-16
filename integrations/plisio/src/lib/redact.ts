import { isApiErrorRecord } from 'slates';

let secretKey =
  /^(?:api[-_]?key|key|token|access[-_]?token|refresh[-_]?token|secret|secret[-_]?key|shop[-_]?api[-_]?key|password|authorization)$/i;

export let redactProviderData = (value: unknown, token: string): any => {
  if (typeof value === 'string') {
    let text = value
      .replace(/https?:\/\/[^\s"'<>]+/gi, original => {
        try {
          let url = new URL(original);
          let changed = false;
          if (url.username || url.password) {
            url.username = '';
            url.password = '';
            changed = true;
          }
          for (let key of [...url.searchParams.keys()]) {
            if (secretKey.test(key)) {
              url.searchParams.set(key, '[redacted]');
              changed = true;
            }
          }
          return changed ? url.toString() : original;
        } catch {
          return original;
        }
      })
      .split(token)
      .join('[redacted]');
    for (let encoded of [encodeURIComponent(token), encodeURI(token)]) {
      if (encoded !== token) text = text.split(encoded).join('[redacted]');
    }
    return text.replace(
      /([?&](?:api[-_]?key|token|access[-_]?token|refresh[-_]?token|secret|password|authorization)=)[^&#\s]*/gi,
      '$1[redacted]'
    );
  }
  if (Array.isArray(value)) return value.map(item => redactProviderData(item, token));
  if (isApiErrorRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        secretKey.test(key) ? '[redacted]' : redactProviderData(item, token)
      ])
    );
  }
  return value;
};
