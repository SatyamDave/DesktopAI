import { RingBuffer } from './audioUtils';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as os from 'os';

const transcriptSnippets = new RingBuffer(60); // 2 min window if 2s per chunk
const dbPath = path.join(os.homedir(), '.delo_transcripts.sqlite');
const db = new Database(dbPath);
db.exec(`CREATE TABLE IF NOT EXISTS transcript (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT,
  ts INTEGER
)`);

// Purge >7 days old on load
const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
db.prepare('DELETE FROM transcript WHERE ts < ?').run(sevenDaysAgo);

export function snippetStoreAppend(text, ts) {
  transcriptSnippets.push({ text, ts });
  db.prepare('INSERT INTO transcript (text, ts) VALUES (?, ?)').run(text, ts);
  console.log('[Transcript]', text);
}
export function getTranscriptSnippets() {
  return transcriptSnippets.getAll();
}
export function getTranscriptBuffer() {
  return transcriptSnippets;
}
export function getTranscriptArchive(since = 0) {
  return db.prepare('SELECT text, ts FROM transcript WHERE ts > ? ORDER BY ts ASC').all(since);
} 