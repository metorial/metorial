# <img src="logo.png" height="20"> Anonyflow

Encrypt and decrypt sensitive strings and selected fields in data objects using the AnonyFlow cloud API. Includes an API key connection check.

The existing `encryptedValue`, `protectedFields`, and `fields` outputs contain the full provider response. Use `protect_value` output `value` for `unprotect_value`, and `protect_data` output `values` for `unprotect_data`.

An empty `keys` array processes the entire data object. Packet decryption can return the string `Error` for an individual field that could not be decrypted; inspect the returned values.

This integration follows the [published cloud API reference](https://documenter.getpostman.com/view/12641271/TVCjvkLG). The [current AnonyFlow website](https://anonyflow.com/) focuses on local document redaction products. Current cloud API availability has not been verified. Document redaction, sharing, deletion, and key management are not exposed by this integration.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
