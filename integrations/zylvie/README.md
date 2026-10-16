# <img src="logo.svg" height="20"> Zylvie

Manage digital products, discount coupons, per-email coupon eligibility, software license keys, and subscription verification. Retrieve the authenticated account’s email and brand information.

Connect with an API key from **Settings > API** in the Zylvie dashboard. Product creation and updates support uploaded license-code pools, images, public file URLs, pricing, shipping, post-purchase emails, and gated pages. Product file URLs configure what customers receive; these tools do not download files.

Coupon tools support one-use-per-email limits and eligibility windows. Use `grant_coupon_eligibility` when a customer becomes eligible; repeated grants retain the original start time. Use `get_coupon_eligibility` to inspect that grant. `list_coupons` returns either active or archived coupons according to its filter. Deleting a previously purchased product or used coupon can archive it instead; the provider’s response explains the outcome.

License keys can be generated UUIDs or custom codes uploaded in the dashboard. Refunding a license key marks the key as invalid; it does not claim to process a payment refund.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
