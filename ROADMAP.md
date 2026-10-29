# LinkUp Product Roadmap

This roadmap is the working checklist for the next product stages. Work through **Core Required** in order; only start **Advanced** after every core item is complete and verified. When an item is finished, update its checkbox and completion note, then move to the next item.

## How to use this roadmap

- `[x]` means implemented and verified; `[ ]` means remaining.
- Keep core work focused on a safe, useful launch. Defer advanced monetization and engagement features until core is complete.
- Before marking an item done, meet its completion criteria and run the relevant checks/tests.
- Add a short completion note and date when changing an item to `[x]`.
- Do not enable real-money rewards, purchases, or withdrawals before provider integration, reconciliation, and qualified legal/tax review.

## Core Required

Complete these items in order.

### 1. Onboarding and first useful interaction

- [x] Add a profile-completion checklist that shows what is complete and links to the relevant edit screen.
- [x] Guide new members from signup to completing their profile, discovering people, and taking a first meaningful action (such as sending a like or starting a conversation after a match).
- [x] Make optional profile fields clearly optional; do not block access to the app for non-essential details.
- [x] Verify the experience on desktop and mobile, including empty states and recoverable errors.

**Done:** 2026-10-28. Added the optional profile checklist and Discovery path, removed the required constraint from optional city during signup, labeled optional signup fields, and tested a fresh signup through the feed checklist, profile edit link, and empty Discovery state on an isolated local database. Verified desktop/mobile layouts, backend account/profile tests, and frontend production build. No development database was used for the browser smoke test.

### 2. Trust, safety, and privacy experience

- [ ] Make block and report actions easy to find on profiles, messages, posts, and live experiences where applicable.
- [ ] Explain what happens after blocking or reporting, confirm successful actions, and show useful error/retry states.
- [ ] Add a concise safety guide covering privacy, unwanted contact, suspicious requests, and how to get help.
- [ ] Review profile visibility, notification controls, and user-facing profile data so members can understand and change what is visible.
- [ ] Test that blocks consistently prevent or hide relevant profile, matching, messaging, and live interactions.

**Done when:** users can find and use safety controls, understand their effect, and tests verify blocked interactions are consistently unavailable.

### 3. Better post-match conversations

- [ ] Review the existing shared-interest icebreakers and ensure suggestions are optional, editable drafts—not sent automatically.
- [ ] Make it easy to start or resume a conversation after a match.
- [ ] Ensure mute, block, and report actions are understandable and accessible from the conversation.
- [ ] Improve conversation empty, loading, failure, and no-longer-matched states.

**Done when:** a match can open a conversation, use or ignore a prompt, and reach safety actions without losing existing message history or state.

### 4. Referral measurement and reward policy

- [x] Add personal referral links, signup attribution, and an invite count; keep referral codes private. Verified and deployed to the configured development database on 2026-10-28.
- [ ] Decide whether referrals should ever receive a reward. For the first release, keep the current track-only behavior unless and until the decision is reviewed.
- [ ] If rewards are approved, define a qualified referral event, limits, self-referral and duplicate-account protections, review/appeal handling, and clear user-facing terms.
- [ ] Review the proposed reward with qualified legal and tax advisers before implementation; do not offer cash or withdrawable credits by default.
- [ ] Add abuse monitoring and tests before enabling any reward.

**Done when:** referral attribution is measurable and privacy-safe. Any reward remains disabled until its eligibility, abuse controls, terms, and legal/tax review are documented and approved.

### 5. Production and launch readiness

- [ ] Review account, profile, referral, and media data handling; document retention, user support, and account deletion expectations.
- [ ] Confirm deployed secrets, HTTPS, database backups and restore procedure, monitoring, error reporting, and operational ownership.
- [ ] Test email delivery, password reset, upload permissions, rate limits, and database migration procedure in the deployment environment.
- [ ] Resolve launch-blocking defects and verify the core user journeys on supported mobile and desktop browsers.

**Done when:** a deployment checklist is completed, a backup restore is tested, and critical user journeys and operational alerts have been verified in the target environment.

### 6. Moderator and admin experience (last core feature)

- [ ] Build a dedicated, staff-only moderation workflow for user and content reports, verification requests, and escalations.
- [ ] Use role-based permissions so moderators receive only the access needed for their responsibilities.
- [ ] Provide clear case status, assignment/ownership, decision notes, and safe next actions.
- [ ] Keep an auditable record of staff decisions and relevant changes; restrict access to sensitive information.
- [ ] Add tests for authorization, workflow transitions, audit history, and notification outcomes.
- [ ] Document moderator procedures for reports, appeals/escalations, and verification decisions.

**Done when:** authorized staff can process the core moderation queues reliably, unauthorized roles cannot perform restricted actions, and actions are auditable. This is intentionally the final core feature.

## Advanced

Start these only after all Core Required items are complete. Prioritize based on user feedback and product metrics.

### A. Referral rewards

- [ ] Revisit referral incentives after track-only usage provides meaningful data.
- [ ] If approved, implement the reviewed reward rules, qualification checks, abuse prevention, user disclosures, and support workflow.
- [ ] Keep monetary rewards and withdrawable value disabled until payment, reconciliation, and legal/tax requirements are satisfied.

### B. Credit purchases and creator payouts

- [ ] Select a payment aggregator that supports the target markets and payment methods.
- [ ] Implement sandbox checkout and verified server-to-server callbacks, idempotency, ledger reconciliation, refunds, and chargeback handling.
- [ ] Reassess credit pricing, creator/platform split, provider fees, taxes, and payout terms with qualified advisers.
- [ ] Implement creator verification and secure withdrawals only after settlement, legal, tax, consumer-protection, and operational requirements are approved.

The current 100-credit/KSh 50 rate and 80/20 creator/platform split are planning estimates, not promises. Checkout and withdrawals are currently disabled.

### C. Deeper retention and personalization

- [ ] Measure profile completion, first like/match, first message, and return activity with privacy-conscious analytics.
- [ ] Improve Discovery ranking only when there is a clear user benefit and transparent controls.
- [ ] Consider richer match prompts, conversation tools, and notification timing based on measured user needs.
- [ ] Evaluate features through small releases and monitor safety and user feedback alongside engagement.

### D. Expanded live and community experiences

- [ ] Consider live moderation controls, audience management, and reporting improvements.
- [ ] Explore additional community formats or creator tools only after safety and operational capacity are ready.
- [ ] Add analytics for live participation and retention without collecting unnecessary personal data.
