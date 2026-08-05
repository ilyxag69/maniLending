# Security claims requiring owner confirmation

The following statements are currently visible on the site and must be verified
against the actual application architecture, bank integrations, contracts and
production infrastructure before the large prelaunch:

- TLS 1.3 is enforced for every application and API connection.
- Data at rest is encrypted with AES-256.
- Bank connections use Open Banking or equivalent protected operators.
- Issued bank tokens are technically limited to read-only access.
- Mani cannot initiate transfers, payments or other money operations.
- Personal identifiers are removed before financial signals are sent to an AI model.
- Account data, chat history and analytical traces are erased within minutes.
- No residual archives or backups remain after deletion.
- Employees cannot view financial data.
- Passwords, PIN codes and full card details are never requested or stored.

Files containing these claims:

- `bezopasnost.html`
- `faq.html`
- `index.html`
- `privacy.html`

Until the owner confirms each point, these statements should be treated as
product requirements or intended architecture, not independently verified facts.
