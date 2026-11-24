// Shared mode: Firestore backend. Data model:
//   groups/{groupId}                 { name, baseCurrency, members: [names], createdAt }
//   groups/{groupId}/expenses/{id}   { kind, title, amount, currency, paidBy, split,
//                                      rates, rateFixed, rateDate, date, createdBy, createdAt, updatedAt }
import {
  doc,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from './firebase.js';
import { newGroupId } from './ids.js';


const groupRef = (id) => doc(db, 'groups', id);
const expensesRef = (id) => collection(db, 'groups', id, 'expenses');

export async function createGroup({ name, baseCurrency, members }) {
  const id = newGroupId();
  await setDoc(groupRef(id), { name, baseCurrency, members, createdAt: serverTimestamp() });
  return id;
}

export function updateGroup(id, fields) {
  return updateDoc(groupRef(id), fields);
}

export function addMember(id, name) {
  return updateDoc(groupRef(id), { members: arrayUnion(name) });
}

/** Calls onData(group) on every change, or onData(null) once the server confirms it doesn't exist. */
export function subscribeGroup(id, onData, onError) {
  return onSnapshot(
    groupRef(id),
    { includeMetadataChanges: true },
    (snap) => {
      if (snap.exists()) onData({ id, ...snap.data() });
      else if (!snap.metadata.fromCache) onData(null);
    },
    onError,
  );
}

export function subscribeExpenses(id, onData, onError) {
  return onSnapshot(
    expensesRef(id),
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));
      list.sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0),
      );
      onData(list);
    },
    onError,
  );
}

/**
 * Create (id = null) or replace an expense. Resolves when the server confirms;
 * the UI doesn't wait for that, because the local cache updates immediately
 * (and offline writes are queued).
 */
export function saveExpense(groupId, id, data, createdAt) {
  const ref = id ? doc(expensesRef(groupId), id) : doc(expensesRef(groupId));
  return setDoc(ref, { ...data, createdAt: createdAt ?? serverTimestamp(), updatedAt: serverTimestamp() });
}

export function deleteExpense(groupId, id) {
  return deleteDoc(doc(expensesRef(groupId), id));
}
