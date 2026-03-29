# Credentials

> **SECURITY WARNING: Never commit real secrets, passwords, API keys, tokens, or private certificates to this folder — or anywhere in this repository.**
>
> If you accidentally commit a secret, treat it as compromised immediately: rotate it and purge it from git history.

This folder is for **credential templates and documentation only** — the shape of what's needed, not the values themselves.

## What belongs here

- **`.env.example`** — a template listing every required environment variable with placeholder values
- **Secret naming conventions** — document what each credential is for and where to obtain it
- **Service account setup guides** — step-by-step instructions for provisioning access to external services
- **Certificate format notes** — expected formats, expiry policies, and renewal procedures

## What does NOT belong here

- Real API keys, tokens, or passwords (use a secrets manager or `.env` file that is gitignored)
- Private keys or certificates with real values
- Database connection strings with real credentials
- Any file containing a value that would grant access to a live system

## Recommended approach

1. Add a `.env.example` file here (or at the project root) listing required variables with dummy values
2. Add `.env` and any real secret files to `.gitignore`
3. Use a secrets manager (e.g. Doppler, AWS Secrets Manager, Azure Key Vault) or a secure team vault (e.g. 1Password) for the actual values
4. Document _where_ each secret lives and _who_ can grant access
