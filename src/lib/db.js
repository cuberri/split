// Picks the storage backend. Components import from here only.
//   Local mode  -> db-local.js     (this browser only, no account needed)
//   Shared mode -> db-firestore.js (shareable links, live updates)
import { LOCAL_MODE } from './firebase.js';
import * as local from './db-local.js';
import * as firestore from './db-firestore.js';

const impl = LOCAL_MODE ? local : firestore;

export const cleanName = (s) => String(s ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);

export const createGroup = (...a) => impl.createGroup(...a);
export const updateGroup = (...a) => impl.updateGroup(...a);
export const addMember = (...a) => impl.addMember(...a);
export const subscribeGroup = (...a) => impl.subscribeGroup(...a);
export const subscribeExpenses = (...a) => impl.subscribeExpenses(...a);
export const saveExpense = (...a) => impl.saveExpense(...a);
export const deleteExpense = (...a) => impl.deleteExpense(...a);
