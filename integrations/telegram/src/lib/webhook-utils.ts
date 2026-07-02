export let generateSecretToken = (): string => {
  let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

export let verifySecretToken = (request: Request, expectedToken: string): boolean => {
  let headerToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  return headerToken === expectedToken;
};
