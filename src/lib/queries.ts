'use client';

import { useEffect, useState } from 'react';
import {
  collection, limit as fbLimit, onSnapshot, orderBy, query, where,
  type Query, type QueryConstraint,
} from 'firebase/firestore';
import { firebase } from './firebase';

export interface Live<T> {
  data: T[];
  loading: boolean;
  /** A sentence, never a raw exception. */
  error: string | null;
}

/**
 * Subscribes to a collection.
 *
 * Errors are surfaced, never swallowed into an empty list. An audit of the
 * Android app found the opposite everywhere — a denied read rendered as "0
 * proposals" or an empty roster, which reads as a confident wrong answer
 * rather than a failure. Callers here get `error` and must show it.
 */
export function useCollection<T>(
  path: string | null,
  constraints: QueryConstraint[] = [],
  deps: unknown[] = [],
): Live<T> {
  const [state, setState] = useState<Live<T>>({ data: [], loading: true, error: null });

  useEffect(() => {
    if (!path) { setState({ data: [], loading: false, error: null }); return; }
    const fb = firebase();
    if (!fb) {
      setState({ data: [], loading: false, error: 'Firebase is not configured for this build.' });
      return;
    }

    const q = query(collection(fb.db, path), ...constraints) as Query;
    const stop = onSnapshot(
      q,
      (snap) => setState({
        data: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T),
        loading: false,
        error: null,
      }),
      (e) => setState({ data: [], loading: false, error: describeQueryFailure(e) }),
    );
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);

  return state;
}

/**
 * Turns a failed query into a sentence that names the actual cause.
 *
 * `failed-precondition` is Firestore saying "this query needs a composite
 * index" — a deployment gap, not a network one. Calling it a connection
 * problem sent people to check their wifi over a missing index, so the
 * message now says what it is, and passes through the console link Firestore
 * puts in the error text.
 */
function describeQueryFailure(e: { code?: string; message?: string }): string {
  if (e.code === 'permission-denied') {
    return 'You do not have access to this, or the security rules have not '
      + 'been deployed for this project.';
  }
  if (e.code === 'failed-precondition') {
    const link = e.message?.match(/https:\/\/\S+/)?.[0];
    return 'This list needs a Firestore index that has not been created yet.'
      + (link ? ` Create it here: ${link}` : ' Run `firebase deploy --only firestore:indexes`.');
  }
  if (e.code === 'unavailable') {
    return 'Could not reach the database. Check your connection and try again.';
  }
  return 'That could not be loaded. Please try again.';
}

/**
 * Ordering happens here, not in the query, and that is deliberate.
 *
 * Pairing a `where` with an `orderBy` on a *different* field is what forces a
 * composite index, and an un-deployed index fails the whole query — the list
 * renders as an error rather than as unsorted rows. Equality and
 * array-contains filters on their own ride the single-field indexes Firestore
 * maintains automatically, so these queries work the moment the rules are
 * published, with nothing else to deploy.
 *
 * The cost is that the sort happens on the client, over the documents that
 * account can already read. At this scale that is a few dozen rows. If a
 * single account ever holds thousands, move the ordering back into the query
 * and deploy firebase/firestore.indexes.json, which still carries them.
 */
export function byNewest<T extends { createdAt?: { seconds?: number } }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
}

export function byRecentMessage<T extends { lastMessageAt?: { seconds?: number } }>(
  rows: T[],
): T[] {
  return [...rows].sort(
    (a, b) => (b.lastMessageAt?.seconds ?? 0) - (a.lastMessageAt?.seconds ?? 0));
}

/** Open listings. Status is filtered client-side for the same reason. */
export const openJobs = (max = 60) => [fbLimit(max)];

export const myJobs = (uid: string) => [where('ownerId', '==', uid)];

export const myProposals = (uid: string) => [where('freelancerId', '==', uid)];

/**
 * Applicants on one listing, for the owner.
 *
 * Scoped by `jobOwnerId` as well as `jobId`, and that is not redundant.
 * Firestore rules are not filters: a query is refused outright unless its
 * constraints prove every document it could return is readable. The proposal
 * read rule allows the bidder or the job owner, so `jobId` alone proves
 * neither and the whole query was denied — which surfaced as an empty
 * applicant list on a job that had bids.
 */
export const proposalsForJob = (jobId: string, ownerId: string) =>
  [where('jobId', '==', jobId), where('jobOwnerId', '==', ownerId)];

export const myChats = (uid: string) =>
  [where('participantIds', 'array-contains', uid)];
