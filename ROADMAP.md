# LinkUp Product Roadmap

**Target hosting date:** 2026-11-20.

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

- [x] Make block and report actions easy to find on profiles, messages, posts, and live experiences where applicable. Completed 2026-10-30: added explicit conversation and live-room actions, confirmed block outcomes in the Safety Center, and verified blocked match, message, typing, and live-join behavior.
- [x] Explain what happens after blocking or reporting, confirm successful actions, and show useful error/retry states. Completed 2026-10-30: report/block confirmations and errors are visible in the Safety Center; message and live blocks return there with success feedback.
- [x] Add a concise safety guide covering privacy, unwanted contact, suspicious requests, and how to get help. Completed 2026-10-30: guide directs members to submit an in-app report and separates urgent real-world risks to local emergency services.
- [x] Review profile visibility, notification controls, and user-facing profile data so members can understand and change what is visible. Completed 2026-10-30: added profile visibility disclosure, confirmed hidden profiles are excluded from Discovery/public reads, verified private account fields stay out of public profiles, and tested notification preference persistence.
- [x] Test that blocks consistently prevent or hide relevant profile, matching, messaging, and live interactions. Completed 2026-10-30: verified block behavior across profile visibility, likes/matches, message reads/sends/activity, and live listings/joins with focused regression tests.

**Done when:** users can find and use safety controls, understand their effect, and tests verify blocked interactions are consistently unavailable.

### 3. Better post-match conversations

- [x] Review the existing shared-interest icebreakers and ensure suggestions are optional, editable drafts—not sent automatically. Completed 2026-10-30: prompts fill an editable draft and require the member to send it.
- [x] Make it easy to start or resume a conversation after a match. Completed 2026-10-30: match rows open the specific conversation, which loads the existing message history.
- [x] Ensure mute, block, and report actions are understandable and accessible from the conversation. Completed 2026-10-30: mute persists per match and suppresses only that recipient's message notifications; messages remain available, and report/block actions are explicit with confirmation and feedback.
- [x] Improve conversation empty, loading, failure, and no-longer-matched states. Completed 2026-10-30: added direct match loading, a distinct unavailable state for blocked/removed matches, and retry messaging that preserves loaded history during transient failures.

**Done when:** a match can open a conversation, use or ignore a prompt, and reach safety actions without losing existing message history or state.

### 4. Referral measurement and reward policy

- [x] Add personal referral links, signup attribution, and an invite count; keep referral codes private. Verified and deployed to the configured development database on 2026-10-28.
- [x] Decide whether referrals should ever receive a reward. For the first release, keep the current track-only behavior unless and until the decision is reviewed. Decision 2026-10-30: first release remains track-only; any future reward requires separate product, abuse, legal, and tax review.
- [ ] If rewards are approved, define a qualified referral event, limits, self-referral and duplicate-account protections, review/appeal handling, and clear user-facing terms.
- [ ] Review the proposed reward with qualified legal and tax advisers before implementation; do not offer cash or withdrawable credits by default.
- [ ] Add abuse monitoring and tests before enabling any reward.

**Done when:** referral attribution is measurable and privacy-safe. Any reward remains disabled until its eligibility, abuse controls, terms, and legal/tax review are documented and approved.

### 5. Production and launch readiness

- [x] Review account, profile, referral, and media data handling; document retention, user support, and account deletion expectations. Review documented in `backend/README.md` on 2026-10-30; retention periods, real support contact, deletion workflow, and R2 cleanup remain launch blockers pending owner and qualified legal review.
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
