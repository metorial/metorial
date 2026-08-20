import * as braintree from 'braintree';

export let braintreeTestCredentials = {
  environment: 'sandbox',
  merchantId: 'merchant-id',
  publicKey: 'public-key',
  privateKey: 'private-key'
};

let gateway = () =>
  new braintree.BraintreeGateway({
    environment: braintree.Environment.Sandbox,
    merchantId: braintreeTestCredentials.merchantId,
    publicKey: braintreeTestCredentials.publicKey,
    privateKey: braintreeTestCredentials.privateKey
  });

export let signedBraintreeSample = async () =>
  gateway().webhookTesting.sampleNotification('check' as never, 'sample-id');
