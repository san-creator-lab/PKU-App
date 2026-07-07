import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Backend, FoodEntry, NewFoodEntry, Profile } from './backend/types'

/**
 * Offline outbox: writes queued in IndexedDB while offline, flushed FIFO on
 * reconnect. Entries carry a client-generated `client_id`, and the backends
 * upsert on it, so retries are idempotent and conflict resolution is
 * last-write-wins on the server's updated_at.
 */

export type OutboxOp =
  | { kind: 'addEntry'; payload: NewFoodEntry }
  | { kind: 'updateEntry'; id: string; patch: Partial<FoodEntry> }
  | { kind: 'deleteEntry'; id: string }
  | { kind: 'updateProfile'; id: string; patch: Partial<Profile> }

interface OutboxDB extends DBSchema {
  ops: { key: number; value: OutboxOp & { queuedAt: string } }
}

let dbPromise: Promise<IDBPDatabase<OutboxDB>> | null = null

function db() {
  dbPromise ??= openDB<OutboxDB>('hero-fuel-outbox', 1, {
    upgrade(database) {
      database.createObjectStore('ops', { autoIncrement: true })
    },
  })
  return dbPromise
}

export async function enqueue(op: OutboxOp): Promise<void> {
  await (await db()).add('ops', { ...op, queuedAt: new Date().toISOString() })
}

export async function pendingCount(): Promise<number> {
  return (await db()).count('ops')
}

/** True for errors that mean "try again later" rather than "bad request". */
export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  if (err instanceof TypeError) return true // fetch() network failure
  const msg = err instanceof Error ? err.message.toLowerCase() : ''
  return msg.includes('fetch') || msg.includes('network') || msg.includes('timeout')
}

/**
 * Flush queued ops in order. Stops (keeping the rest queued) on the first
 * network failure; drops ops that fail permanently. Returns #flushed.
 */
export async function flush(backend: Backend): Promise<number> {
  const database = await db()
  let flushed = 0
  let cursor = await database.transaction('ops').store.openCursor()
  const keys: number[] = []
  const ops: OutboxOp[] = []
  while (cursor) {
    keys.push(cursor.key)
    ops.push(cursor.value)
    cursor = await cursor.continue()
  }

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]
    try {
      if (op.kind === 'addEntry') await backend.addEntry(op.payload)
      else if (op.kind === 'updateEntry') await backend.updateEntry(op.id, op.patch)
      else if (op.kind === 'updateProfile') await backend.updateProfile(op.id, op.patch)
      else await backend.deleteEntry(op.id)
      await database.delete('ops', keys[i])
      flushed++
    } catch (err) {
      if (isNetworkError(err)) break // still offline — keep queue intact
      await database.delete('ops', keys[i]) // permanent failure: drop op
    }
  }
  return flushed
}
