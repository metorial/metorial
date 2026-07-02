import { createAxios } from '@slates/provider';
import { withFirebaseApiError } from './errors';

let googleAuthAxios = createAxios({
  baseURL: 'https://oauth2.googleapis.com'
});

let base64UrlEncode = (str: string): string => {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

let arrayBufferToBase64Url = (buffer: ArrayBuffer): string => {
  let bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

let pemToArrayBuffer = (pem: string): ArrayBuffer => {
  let b64 = pem
    .replace(/-----BEGIN [A-Z ]+-----/g, '')
    .replace(/-----END [A-Z ]+-----/g, '')
    .replace(/\s/g, '');
  let binary = atob(b64);
  let bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

let importPrivateKey = async (pem: string) => {
  let keyData = pemToArrayBuffer(pem);
  return crypto.subtle.importKey(
    'pkcs8',
    keyData,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  );
};

export let createSignedJwt = async (params: {
  clientEmail: string;
  privateKey: string;
  scopes: string[];
}): Promise<string> => {
  let now = Math.floor(Date.now() / 1000);

  let header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  let payload = {
    iss: params.clientEmail,
    scope: params.scopes.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };

  let headerEncoded = base64UrlEncode(JSON.stringify(header));
  let payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  let signingInput = `${headerEncoded}.${payloadEncoded}`;

  let key = await importPrivateKey(params.privateKey);
  let encoder = new TextEncoder();
  let signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    encoder.encode(signingInput)
  );

  let signatureEncoded = arrayBufferToBase64Url(signature);
  return `${signingInput}.${signatureEncoded}`;
};

export let exchangeJwtForAccessToken = async (
  jwt: string
): Promise<{
  accessToken: string;
  expiresIn: number;
}> => {
  let response = await withFirebaseApiError('service account token exchange', () =>
    googleAuthAxios.post(
      '/token',
      new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    )
  );

  return {
    accessToken: response.data.access_token,
    expiresIn: response.data.expires_in
  };
};

export let getAccessTokenFromServiceAccount = async (params: {
  clientEmail: string;
  privateKey: string;
  scopes: string[];
}): Promise<{
  accessToken: string;
  expiresAt: string;
}> => {
  let jwt = await createSignedJwt(params);
  let result = await exchangeJwtForAccessToken(jwt);
  let expiresAt = new Date(Date.now() + result.expiresIn * 1000).toISOString();
  return {
    accessToken: result.accessToken,
    expiresAt
  };
};
