# Data 247

Look up phone carriers, SMS/MMS gateways, and caller names. Verify contact details and phone ownership, enrich contact records, geolocate IP addresses, check Do-Not-Call status, and evaluate user identity. Inspect account balance, service access, rates, and usage.

## Account tools

- `get_account_info` returns account capabilities and rates.
- `get_usage` returns query counts and spend by period.
- `verify_phone_owner` checks a subscriber name or company against a phone number.

Batch lookup results include the provider's query status when supplied. Profile, property, and fraud results include the original JSON result alongside existing string-valued fields. The legacy phone-spam option remains available; its current response contract is not described in the published manual.

API authentication, service codes, and response formats follow the [official API manual](https://www.data247.com/api_user_manual).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
