export let parseFormUrlEncoded = (body: string): Record<string, string> => {
  let result: Record<string, string> = {};
  let pairs = body.split('&');
  for (let pair of pairs) {
    let [key, value] = pair.split('=');
    if (key) {
      result[decodeURIComponent(key)] = value
        ? decodeURIComponent(value.replace(/\+/g, ' '))
        : '';
    }
  }
  return result;
};
