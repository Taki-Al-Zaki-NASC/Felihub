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
  // The two accounts actually in use — one client, one freelancer. Both sides
  // of the marketplace need their own account: a job cannot be created on
  // someone else's behalf, because the rules require isSelf(ownerId).
  //
  // Note the .com. An earlier list had demo@felicek.app, which matched
  // nothing, so that account was never granted the skip and kept being asked
  // for a deposit it could not pay.
  'ktahan629@gmail.com',
  'demo@felicek.com',
];

export function isDemoAccount(email: string | null | undefined): boolean {
  if (!email) return false;
  return DEMO_ACCOUNTS.includes(email.trim().toLowerCase());
}

/**
 * Whether the deposit can be cleared without paying, for anyone.
 *
 * Mirrors `freeVerification()` in firebase/firestore.rules, and the rules file
 * is the one that decides — flipping this alone changes what the UI offers,
 * not what the server permits. Change both together.
 *
 * While this is true the marketplace's deposit guarantees are suspended: a
 * "deposit-backed" badge is self-issued and escrow can be funded with money
 * that was never collected. It is on so the product can be walked end to end
 * before a payment gateway exists, and it must go off before real money does.
 */
export const FREE_VERIFICATION = true;
