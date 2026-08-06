# Security Policy

## Secret Scanning and Push Protection

This repository relies on GitHub Secret Scanning and Push Protection to prevent accidental leaks of credentials, API keys, and other sensitive information.

### Maintainer Unblock Process for False Positives

If Push Protection blocks a commit due to a suspected secret that is actually a false positive (e.g., dummy test data or a non-sensitive string resembling a token), maintainers and contributors can unblock the push by following these steps:

1. **Review the Block:** When a push is blocked, the Git output will display a message with a link to GitHub.
2. **Navigate to the Link:** Open the provided link in your web browser to view the detected secret.
3. **Select Bypass Reason:** If you have confirmed it is a false positive, select the appropriate reason from the dropdown (e.g., "False positive", "Used in tests", or "Will fix later").
4. **Confirm the Bypass:** Submit the form to bypass the protection for this specific secret.
5. **Re-push:** Run your `git push` command again. It will now succeed.

**Important:** 
- Bypasses are audited. Maintainers periodically review bypass logs.
- **Never bypass push protection for a real secret.** If a real secret is detected, remove it from your commit history before pushing. If it was already exposed, it must be rotated immediately.
