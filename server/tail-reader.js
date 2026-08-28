import fs from 'node:fs';
import fsp from 'node:fs/promises';

/** Cold start reads at most this much of a file's tail (plan 2.2). */
export const COLD_TAIL_BYTES = 512 * 1024;

/**
 * Incremental reader for one append-only JSONL file.
 *
 * Keeps a byte offset and the trailing partial line, so a `change` event only
 * ever reads the bytes that were appended. Truncation and inode changes reset
 * the offset back to zero.
 */
export class TailReader {
  constructor(filePath) {
    this.path = filePath;
    this.offset = 0;
    this.inode = null;
    this.pending = '';
    this.parseErrors = 0;
    this.started = false;
  }

  /**
   * Position the reader without emitting anything: used on cold start so that
   * history older than the tail window is never parsed.
   */
  async prime({ tailBytes = COLD_TAIL_BYTES } = {}) {
    const stat = await fsp.stat(this.path).catch(() => null);
    if (!stat) return;
    this.inode = stat.ino;
    this.offset = Math.max(0, stat.size - tailBytes);
    this.pending = '';
    if (this.offset > 0) this.dropFirstPartialLine = true;
    this.started = true;
  }

  /** Read everything appended since the last call. Returns raw line strings. */
  async read() {
    const stat = await fsp.stat(this.path).catch(() => null);
    if (!stat) return [];

    if (this.inode !== null && stat.ino !== this.inode) {
      // file was rotated out from under us
      this.offset = 0;
      this.pending = '';
    }
    this.inode = stat.ino;

    if (stat.size < this.offset) {
      // truncated
      this.offset = 0;
      this.pending = '';
    }
    if (stat.size === this.offset) return [];

    const chunk = await this.#readRange(this.offset, stat.size - 1);
    this.offset = stat.size;

    let text = this.pending + chunk;
    const parts = text.split('\n');
    this.pending = parts.pop() ?? '';

    if (this.dropFirstPartialLine) {
      this.dropFirstPartialLine = false;
      parts.shift();
    }
    return parts;
  }

  #readRange(start, end) {
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(this.path, { start, end, encoding: 'utf8' });
      let out = '';
      stream.on('data', (d) => {
        out += d;
      });
      stream.on('end', () => resolve(out));
      stream.on('error', reject);
    });
  }
}
