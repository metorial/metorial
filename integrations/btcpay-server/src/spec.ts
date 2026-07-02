import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'btcpay-server',
  name: 'BTCPay Server',
  description:
    'Self-hosted, open-source cryptocurrency payment processor. Accept Bitcoin and other cryptocurrencies directly without fees or third-party intermediaries.',
  metadata: {},
  config,
  auth
});
