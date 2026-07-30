/**
 * Demo accounts — the deliberate hole in the payment gate.
 *
 * READ THIS BEFORE KEEPING IT.
 *
 * An address on this list can mark its own deposit cleared without any
 * payment. That exists so the product can be walked end to end before a
 * payment gateway is connected, because the verification gate is otherwise
 * absolute by design and there is no way in without real money.
 *
 * This list is a *mirror* of `isDemoAccount()` in firebase/firestore.rules,
 * and the rules file is the one that actually decides. Editing this array
 * alone grants nothing — the write is refused server-side. Editing the rules
 * alone works but leaves the button hidden. Change both, together.
 *
 * The match is on `request.auth.token.email`, which Firebase Auth sets and a
 * client cannot forge, so the blast radius is exactly the addresses below.
 *
 * BEFORE TAKING REAL PAYMENTS: empty this array and the matching list in the
 * rules. An address left here is a free verified account for anyone who can
 * register it. It is a two-line change and it is the whole cost of this
 * convenience.
 */
export const DEMO_ACCOUNTS: readonly string[] = [
  // The owner's own account, so the product can be walked end to end without
  // registering a separate address first.
  'ktahan629@gmail.com',
  'demo@felicek.app',
  // A second address so both sides of the marketplace can be walked: post as
  // one, bid as the other. A job cannot be created on someone else's behalf —
  // the rules require isSelf(ownerId) — so seeing a listing from the outside
  // genuinely needs a second account.
  'demo.freelancer@felicek.app',
];

export function isDemoAccount(email: string | null | undefined): boolean {
  if (!email) return false;
  return DEMO_ACCOUNTS.includes(email.trim().toLowerCase());
}
