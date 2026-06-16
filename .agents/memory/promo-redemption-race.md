---
name: Promo redemption per-user race safety
description: Why promo redemption locks the code row, and the gap a plain usesCount increment leaves.
---

# Promo redemption must lock the code row to enforce per-user limits

In `POST /orders`, a promo redemption is recorded inside the order transaction.
Enforcement has TWO independent limits with DIFFERENT race profiles:

- **Global `maxUses`** — guarded safely by a conditional atomic update
  (`UPDATE promo_codes SET usesCount = usesCount + 1 WHERE usesCount < maxUses`),
  which is a single self-referential write and cannot overshoot.
- **Per-user `perUserLimit`** — enforced by `count(redemptions) → evaluate → insert`.
  This count-then-insert pattern is NOT atomic on its own: two concurrent
  checkouts of the same code by the same customer can both read `used < limit`
  and both insert.

**The fix:** take a row lock on the promo row at the top of the promo block
(`select … .for("update")`). This serializes all concurrent redemptions of the
SAME code, so the per-user count read always sees prior committed redemptions.

**Why:** code review flagged that the conditional `usesCount` increment only
protects the global limit; per-user could be raced. Verified the fix with a
6-way parallel order test against a single-use code → exactly one redemption.

**How to apply:** any new redemption-style "check a per-identity count then
insert" logic on promo/coupon/loyalty rows must serialize on the parent row
(FOR UPDATE) or use a DB uniqueness constraint — never rely on count-then-insert
alone. A conditional self-referential UPDATE only covers a single global counter.
