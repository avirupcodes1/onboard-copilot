# IT Security Policy

**Company:** Northwind
**Owner:** Information Security Team (security@northwind.example)
**Effective date:** 2026-07-14
**Applies to:** All employees, contractors, interns, and third parties with access to Northwind systems or data.

This policy is mandatory. Violations may result in loss of access, disciplinary action up to and including termination, and, where applicable, legal or regulatory referral. Questions go to security@northwind.example.

## Security Awareness Training

- Every new hire **must complete Security Awareness Training during Week 1**, before being granted access to any production system, customer data, or internal repository.
- Onboarding access is provisioned in a "training-only" state; standing access is unlocked only after the Week 1 course and quiz are passed (minimum score 80%).
- All staff must complete **annual refresher training** and any ad-hoc modules issued after a significant incident or policy change, within 14 days of assignment.
- Northwind runs **quarterly simulated phishing** exercises. Anyone who fails two simulations in a rolling 12-month period is auto-enrolled in remedial training.
- Report a suspected real phish using the "Report Phish" button, or forward it to security@northwind.example. Reporting is always encouraged and never penalized.

## Multi-Factor Authentication

- **MFA is required on every account**, without exception: SSO/identity provider, email, VPN, cloud consoles, source control, CI/CD, database admin tools, and any SaaS holding company data.
- Approved factors, in order of preference: **hardware security keys (FIDO2/WebAuthn)**, then authenticator-app TOTP or push. **SMS and email codes are not permitted** as a primary factor except as a temporary, ticketed exception.
- Administrative, production, and privileged accounts **must use a phishing-resistant hardware key**.
- Never approve an MFA prompt you did not personally initiate. Repeated unexpected prompts ("MFA fatigue") must be reported to security@northwind.example immediately.
- Enrolling, sharing, or transferring another person's MFA factor is prohibited.

## Password Policy

- Passwords must be a **minimum of 14 characters**. Longer passphrases are encouraged; there is no maximum below 64 characters.
- Every employee **must use the company-provided password manager** to generate and store credentials. Generated passwords should be random and unique per service.
- **Reuse is prohibited.** Do not reuse work passwords on personal accounts, or personal passwords on work accounts.
- Passwords must **never** be stored in plaintext, spreadsheets, notes apps, browser-native stores, code, config files, or chat/email.
- Northwind does not enforce arbitrary periodic rotation; instead, credentials are rotated **immediately** on suspected compromise, on offboarding of anyone who knew a shared secret, or when found in a breach-monitoring alert.
- Service accounts and API keys must be stored in the approved secrets manager, scoped to least privilege, and rotated at least every 90 days.

## Company VPN

- **All access to internal systems must go through the company VPN**, including admin panels, staging/production infrastructure, internal wikis, and databases. Internal systems are not exposed directly to the public internet.
- The VPN client is installed and configured through MDM. Only company-managed, compliant devices may establish a VPN session.
- Split tunneling is disabled by default; internal-bound traffic is routed and inspected per policy.
- Do not connect to the VPN from shared, kiosk, or personal unmanaged devices. Disconnect when not actively working with internal resources.
- VPN credentials are personal. Sharing a VPN profile or session is a reportable violation.

## Data Classification and Handling

All data must be labeled at creation or receipt using one of four tiers. When unsure, default to the more restrictive level and ask security@northwind.example.

- **Public** — Approved for release (marketing pages, published docs). No restrictions, but only the Communications team may publish.
- **Internal** — Default for day-to-day work (internal wikis, non-sensitive tickets, general email). Share only within Northwind and contracted parties under NDA. Do not post publicly.
- **Confidential** — Sensitive business or personal data (customer PII, support ticket contents, contracts, source code, financials). **Encrypt in transit and at rest**, restrict to a need-to-know basis, and never place in public repos, personal cloud drives, or personal email.
- **Restricted** — Highest sensitivity (authentication secrets, encryption keys, payment data, regulated records). Access is explicitly granted per person, logged, and reviewed quarterly. Storage and transfer are limited to approved, hardened systems. Copying to endpoints or removable media is prohibited without written InfoSec approval.

Handling rules that apply across tiers:
- Encrypt Confidential and Restricted data end to end; use only approved tools for sharing.
- Do not paste Confidential or Restricted data into unapproved third-party or AI/LLM tools.
- Delete data per the retention schedule; when in doubt, do not create extra copies.

## Device Management

- All laptops **must be enrolled in the company MDM** before use. Unenrolled devices are blocked from VPN, SSO, and company data.
- MDM enforces: **full-disk encryption**, automatic OS and security patching, screen lock after 5 minutes with password/biometric unlock, endpoint detection and response (EDR), and remote lock/wipe.
- Do not disable, tamper with, or attempt to bypass MDM, EDR, or the firewall.
- Personal (BYOD) devices may access email and approved SaaS only through the managed app container; they may **not** access Restricted data or store company files locally.
- **Report lost or stolen devices within 1 hour** to the 24/7 hotline so the device can be remotely wiped.
- Install software only from the approved catalog or the self-service portal; unvetted software and browser extensions are prohibited.

## Acceptable Use

- Company systems are provided for legitimate business purposes. Limited, reasonable personal use is tolerated but must not interfere with work or violate this policy.
- **Prohibited:** sharing accounts or credentials; disabling security controls; connecting unauthorized hardware; accessing data without a business need; storing company data on personal accounts; and any illegal, harassing, or discriminatory activity.
- Lock your screen when stepping away. Do not leave devices unattended in public or visible in vehicles.
- Use only approved communication and file-sharing tools for company business.
- You have no expectation of privacy in company systems; Northwind may monitor and audit use consistent with law.

## Incident Reporting

**If you suspect a security incident, report it immediately. Reporting quickly is always the right call, even if you are unsure.**

- **Email:** security@northwind.example for non-urgent reports and evidence (forward suspicious messages as attachments).
- **24/7 Hotline:** call the security hotline for anything urgent — active compromise, lost/stolen device, exposed credentials, suspected data breach, or ransomware.
- Report within **1 hour** of discovery for any event involving Confidential/Restricted data, lost devices, or account compromise.
- **Do not** attempt to investigate, "clean up," or delete evidence yourself. Preserve the device and follow instructions from the Information Security Team.
- Retaliation against anyone who reports a suspected incident in good faith is strictly prohibited.

---

*This policy is reviewed at least annually and updated as needed. The current version is authoritative; direct all questions to security@northwind.example.*
