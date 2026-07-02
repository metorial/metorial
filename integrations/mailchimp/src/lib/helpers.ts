export let md5 = (input: string): string => {
  // Simple MD5 implementation for generating subscriber hashes
  let safeAdd = (x: number, y: number): number => {
    let lsw = (x & 0xffff) + (y & 0xffff);
    let msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xffff);
  };

  let bitRotateLeft = (num: number, cnt: number): number => {
    return (num << cnt) | (num >>> (32 - cnt));
  };

  let md5cmn = (q: number, a: number, b: number, x: number, s: number, t: number): number => {
    return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
  };

  let md5ff = (
    a: number,
    b: number,
    c: number,
    d: number,
    x: number,
    s: number,
    t: number
  ): number => {
    return md5cmn((b & c) | (~b & d), a, b, x, s, t);
  };

  let md5gg = (
    a: number,
    b: number,
    c: number,
    d: number,
    x: number,
    s: number,
    t: number
  ): number => {
    return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
  };

  let md5hh = (
    a: number,
    b: number,
    c: number,
    d: number,
    x: number,
    s: number,
    t: number
  ): number => {
    return md5cmn(b ^ c ^ d, a, b, x, s, t);
  };

  let md5ii = (
    a: number,
    b: number,
    c: number,
    d: number,
    x: number,
    s: number,
    t: number
  ): number => {
    return md5cmn(c ^ (b | ~d), a, b, x, s, t);
  };

  let firstChunk = (
    _chunks: number[],
    x: number[],
    a: number,
    b: number,
    c: number,
    d: number
  ): number[] => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    a = md5ff(a, b, c, d, x[0]!, 7, -680876936);
    d = md5ff(d, a, b, c, x[1]!, 12, -389564586);
    c = md5ff(c, d, a, b, x[2]!, 17, 606105819);
    b = md5ff(b, c, d, a, x[3]!, 22, -1044525330);
    a = md5ff(a, b, c, d, x[4]!, 7, -176418897);
    d = md5ff(d, a, b, c, x[5]!, 12, 1200080426);
    c = md5ff(c, d, a, b, x[6]!, 17, -1473231341);
    b = md5ff(b, c, d, a, x[7]!, 22, -45705983);
    a = md5ff(a, b, c, d, x[8]!, 7, 1770035416);
    d = md5ff(d, a, b, c, x[9]!, 12, -1958414417);
    c = md5ff(c, d, a, b, x[10]!, 17, -42063);
    b = md5ff(b, c, d, a, x[11]!, 22, -1990404162);
    a = md5ff(a, b, c, d, x[12]!, 7, 1804603682);
    d = md5ff(d, a, b, c, x[13]!, 12, -40341101);
    c = md5ff(c, d, a, b, x[14]!, 17, -1502002290);
    b = md5ff(b, c, d, a, x[15]!, 22, 1236535329);
    return [a, b, c, d];
  };

  let secondChunk = (
    _chunks: number[],
    x: number[],
    a: number,
    b: number,
    c: number,
    d: number
  ): number[] => {
    a = md5gg(a, b, c, d, x[1]!, 5, -165796510);
    d = md5gg(d, a, b, c, x[6]!, 9, -1069501632);
    c = md5gg(c, d, a, b, x[11]!, 14, 643717713);
    b = md5gg(b, c, d, a, x[0]!, 20, -373897302);
    a = md5gg(a, b, c, d, x[5]!, 5, -701558691);
    d = md5gg(d, a, b, c, x[10]!, 9, 38016083);
    c = md5gg(c, d, a, b, x[15]!, 14, -660478335);
    b = md5gg(b, c, d, a, x[4]!, 20, -405537848);
    a = md5gg(a, b, c, d, x[9]!, 5, 568446438);
    d = md5gg(d, a, b, c, x[14]!, 9, -1019803690);
    c = md5gg(c, d, a, b, x[3]!, 14, -187363961);
    b = md5gg(b, c, d, a, x[8]!, 20, 1163531501);
    a = md5gg(a, b, c, d, x[13]!, 5, -1444681467);
    d = md5gg(d, a, b, c, x[2]!, 9, -51403784);
    c = md5gg(c, d, a, b, x[7]!, 14, 1735328473);
    b = md5gg(b, c, d, a, x[12]!, 20, -1926607734);
    return [a, b, c, d];
  };

  let thirdChunk = (
    _chunks: number[],
    x: number[],
    a: number,
    b: number,
    c: number,
    d: number
  ): number[] => {
    a = md5hh(a, b, c, d, x[5]!, 4, -378558);
    d = md5hh(d, a, b, c, x[8]!, 11, -2022574463);
    c = md5hh(c, d, a, b, x[11]!, 16, 1839030562);
    b = md5hh(b, c, d, a, x[14]!, 23, -35309556);
    a = md5hh(a, b, c, d, x[1]!, 4, -1530992060);
    d = md5hh(d, a, b, c, x[4]!, 11, 1272893353);
    c = md5hh(c, d, a, b, x[7]!, 16, -155497632);
    b = md5hh(b, c, d, a, x[10]!, 23, -1094730640);
    a = md5hh(a, b, c, d, x[13]!, 4, 681279174);
    d = md5hh(d, a, b, c, x[0]!, 11, -358537222);
    c = md5hh(c, d, a, b, x[3]!, 16, -722521979);
    b = md5hh(b, c, d, a, x[6]!, 23, 76029189);
    a = md5hh(a, b, c, d, x[9]!, 4, -640364487);
    d = md5hh(d, a, b, c, x[12]!, 11, -421815835);
    c = md5hh(c, d, a, b, x[15]!, 16, 530742520);
    b = md5hh(b, c, d, a, x[2]!, 23, -995338651);
    return [a, b, c, d];
  };

  let fourthChunk = (
    _chunks: number[],
    x: number[],
    a: number,
    b: number,
    c: number,
    d: number
  ): number[] => {
    a = md5ii(a, b, c, d, x[0]!, 6, -198630844);
    d = md5ii(d, a, b, c, x[7]!, 10, 1126891415);
    c = md5ii(c, d, a, b, x[14]!, 15, -1416354905);
    b = md5ii(b, c, d, a, x[5]!, 21, -57434055);
    a = md5ii(a, b, c, d, x[12]!, 6, 1700485571);
    d = md5ii(d, a, b, c, x[3]!, 10, -1894986606);
    c = md5ii(c, d, a, b, x[10]!, 15, -1051523);
    b = md5ii(b, c, d, a, x[1]!, 21, -2054922799);
    a = md5ii(a, b, c, d, x[8]!, 6, 1873313359);
    d = md5ii(d, a, b, c, x[15]!, 10, -30611744);
    c = md5ii(c, d, a, b, x[6]!, 15, -1560198380);
    b = md5ii(b, c, d, a, x[13]!, 21, 1309151649);
    a = md5ii(a, b, c, d, x[4]!, 6, -145523070);
    d = md5ii(d, a, b, c, x[11]!, 10, -1120210379);
    c = md5ii(c, d, a, b, x[2]!, 15, 718787259);
    b = md5ii(b, c, d, a, x[9]!, 21, -343485551);
    return [a, b, c, d];
  };

  let str2binl = (str: string): number[] => {
    let bin: number[] = [];
    let mask = (1 << 8) - 1;
    for (let i = 0; i < str.length * 8; i += 8) {
      bin[i >> 5] = bin[i >> 5]! | 0 | ((str.charCodeAt(i / 8) & mask) << (i % 32));
    }
    return bin;
  };

  let binl2hex = (binarray: number[]): string => {
    let hexTab = '0123456789abcdef';
    let str = '';
    for (let i = 0; i < binarray.length * 4; i++) {
      str +=
        hexTab.charAt(((binarray[i >> 2]! | 0) >> ((i % 4) * 8 + 4)) & 0xf) +
        hexTab.charAt(((binarray[i >> 2]! | 0) >> ((i % 4) * 8)) & 0xf);
    }
    return str;
  };

  let binlMD5 = (x: number[], len: number): number[] => {
    x[len >> 5] = x[len >> 5]! | 0 | (0x80 << (len % 32));
    x[(((len + 64) >>> 9) << 4) + 14] = len;

    let a = 1732584193;
    let b = -271733879;
    let c = -1732584194;
    let d = 271733878;

    for (let i = 0; i < x.length; i += 16) {
      let olda = a;
      let oldb = b;
      let oldc = c;
      let oldd = d;

      let chunk = x.slice(i, i + 16);
      while (chunk.length < 16) chunk.push(0);
      let result: number[];

      result = firstChunk([], chunk, a, b, c, d);
      a = result[0]!;
      b = result[1]!;
      c = result[2]!;
      d = result[3]!;

      result = secondChunk([], chunk, a, b, c, d);
      a = result[0]!;
      b = result[1]!;
      c = result[2]!;
      d = result[3]!;

      result = thirdChunk([], chunk, a, b, c, d);
      a = result[0]!;
      b = result[1]!;
      c = result[2]!;
      d = result[3]!;

      result = fourthChunk([], chunk, a, b, c, d);
      a = result[0]!;
      b = result[1]!;
      c = result[2]!;
      d = result[3]!;

      a = safeAdd(a, olda);
      b = safeAdd(b, oldb);
      c = safeAdd(c, oldc);
      d = safeAdd(d, oldd);
    }

    return [a, b, c, d];
  };

  return binl2hex(binlMD5(str2binl(input), input.length * 8));
};

export let getSubscriberHash = (email: string): string => {
  return md5(email.toLowerCase().trim());
};
