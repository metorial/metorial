# Ko-fi

Receive Ko-fi payment notifications through a manually configured webhook. Two triggers are available:

- **Donation Received** (`donation_received`): payments whose provider type is `Donation`.
- **Payment Received** (`payment_received`): a companion for all payment notifications, preserving the provider's type string.

Both include the original payment ID, amount as a decimal string, currency, supporter fields, payment permalink, and available payment metadata. The verification token is removed before events are emitted.

## Connect and configure

1. Open [Ko-fi webhook settings](https://ko-fi.com/manage/webhooks) and copy the verification token from the advanced settings.
2. Connect using **Verification Token**. This stores the token locally; Ko-fi provides no documented token-validation endpoint.
3. Start webhook setup, supply the same token, and finish setup before saving or testing the receive URL in Ko-fi.
4. Copy the setup URL into Ko-fi's **Webhook URL** setting and save. Use Ko-fi's test-payment option to check delivery.

Each registration checks the incoming token against its saved token and routes only to connections with the same token. Notifications contain sensitive supporter and payment data. Keep the token private and update both the connection and webhook registration when rotating it.

Ko-fi's [official webhook documentation](https://help.ko-fi.com/hc/en-us/articles/360004162298-Does-Ko-fi-have-an-API-or-webhook) describes payment notifications only. Membership cancellations are not reported. This integration exposes no callable actions or account-identity lookup because no suitable query API is documented.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
