/**
 * Minimal ZIP reader for uploads. Supports stored and deflated entries so the
 * Workbench can analyze an app archive without an external unzip binary.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, posix } from "node:path";
import { inflateRawSync } from "node:zlib";

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;

const LIMITS = {
  entries: 4000,
  fileBytes: 32 * 1024 * 1024,
  totalBytes: 96 * 1024 * 1024,
};

export class ZipError extends Error {}

/** List archive entries without extracting them. */
export const readZipEntries = (buffer) => {
  const end = findEndOfCentralDirectory(buffer);
  let entries = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16);
  if (entries === 0xffff || offset === 0xffffffff)
    throw new ZipError("ZIP64 archives are not supported. Unzip it first.");
  if (entries > LIMITS.entries)
    throw new ZipError(
      `Archive has ${entries} entries; limit is ${LIMITS.entries}.`,
    );

  const results = [];
  for (let index = 0; index < entries; index += 1) {
    if (buffer.readUInt32LE(offset) !== CENTRAL)
      throw new ZipError("Central directory is malformed.");
    const flags = buffer.readUInt16LE(offset + 8);
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const rawName = buffer.subarray(offset + 46, offset + 46 + nameLength);
    const name = rawName.toString(flags & 0x800 ? "utf8" : "latin1");
    offset += 46 + nameLength + extraLength + commentLength;

    const path = safePath(name);
    if (path === null) continue;
    if (name.endsWith("/")) {
      results.push({ path, directory: true });
      continue;
    }
    const data = extractEntry(buffer, localOffset, method, compressedSize);
    if (data.length > LIMITS.fileBytes)
      throw new ZipError(`Entry ${path} exceeds the per-file limit.`);
    void uncompressedSize;
    results.push({ path, directory: false, data });
  }
  const total = results.reduce(
    (sum, entry) => sum + (entry.data?.length ?? 0),
    0,
  );
  if (total > LIMITS.totalBytes)
    throw new ZipError("Archive expands past the 96 MiB limit.");
  return results;
};

/** Extract a ZIP buffer into `destination`, returning written file paths. */
export const extractZip = async (buffer, destination) => {
  const entries = readZipEntries(buffer);
  const written = [];
  for (const entry of entries) {
    const target = join(destination, entry.path);
    if (!target.startsWith(destination)) throw new ZipError("Unsafe ZIP path.");
    if (entry.directory) {
      await mkdir(target, { recursive: true });
      continue;
    }
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, entry.data);
    written.push(entry.path);
  }
  return written;
};

const findEndOfCentralDirectory = (buffer) => {
  const minimum = Math.max(0, buffer.length - 0xffff - 22);
  for (let index = buffer.length - 22; index >= minimum; index -= 1) {
    if (buffer.readUInt32LE(index) === EOCD) return index;
  }
  throw new ZipError("No ZIP central directory was found.");
};

const extractEntry = (buffer, localOffset, method, compressedSize) => {
  if (buffer.readUInt32LE(localOffset) !== LOCAL)
    throw new ZipError("ZIP local header is malformed.");
  const nameLength = buffer.readUInt16LE(localOffset + 26);
  const extraLength = buffer.readUInt16LE(localOffset + 28);
  const start = localOffset + 30 + nameLength + extraLength;
  const body = buffer.subarray(start, start + compressedSize);
  if (method === 0) return Buffer.from(body);
  if (method === 8)
    return inflateRawSync(body, { maxOutputLength: LIMITS.fileBytes });
  throw new ZipError(`Compression method ${method} is not supported.`);
};

const safePath = (name) => {
  const normalized = name.replace(/\\/g, "/");
  if (normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) return null;
  const segments = posix
    .normalize(normalized)
    .split("/")
    .filter((segment) => segment !== "" && segment !== ".");
  if (segments.length === 0) return null;
  if (segments.includes("..")) return null;
  if (segments[0] === "__MACOSX") return null;
  if (segments.at(-1) === ".DS_Store") return null;
  return segments.join("/");
};

/* ------------------------------------------------------------------ writing */

let crcTable = null;
const crc32 = (buffer) => {
  if (crcTable === null) {
    crcTable = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
      let value = index;
      for (let bit = 0; bit < 8; bit += 1)
        value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      crcTable[index] = value >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

/**
 * Build a store-only ZIP from `[{ path, data }]`. Uncompressed output keeps the
 * writer dependency-free and deterministic; it is used for the bundled sample
 * that the artifact workflow inspects.
 */
export const createZip = (entries) => {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.path, "utf8");
    const data = Buffer.isBuffer(entry.data)
      ? entry.data
      : Buffer.from(entry.data);
    const crc = crc32(data);
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    name.copy(local, 30);
    locals.push(local, data);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    centrals.push(central);
    offset += local.length + data.length;
  }
  const centralSize = centrals.reduce((sum, chunk) => sum + chunk.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...locals, ...centrals, end]);
};
