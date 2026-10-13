import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Storage } from '@google-cloud/storage';
import { config } from '../config';

/**
 * File storage for clinic logos and doctor signatures.
 *
 * Production (GCS_BUCKET set): files live in a private Cloud Storage bucket.
 * Cloud Run's local disk is wiped on every restart and new revision, so it
 * must never hold anything that has to survive.
 * Local dev (GCS_BUCKET empty): files live in ./uploads.
 *
 * Either way the stored reference is "/uploads/<name>", so existing database
 * rows and the mobile app keep working unchanged.
 */

const LOCAL_DIR = path.join(process.cwd(), 'uploads');
const PREFIX = 'uploads/';

const ALLOWED_TYPES: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};

const bucket = config.gcsBucket ? new Storage().bucket(config.gcsBucket) : null;

export function isAllowedImage(mimetype: string): boolean {
  return mimetype in ALLOWED_TYPES;
}

/** Only plain generated names are valid; blocks "../" and nested paths. */
function safeName(name: string): string | null {
  return /^[a-zA-Z0-9-]+\.(png|jpg|jpeg|webp)$/.test(name) ? name : null;
}

export function nameFromUrl(url: string): string | null {
  return safeName(url.replace(/^\/?uploads\//, ''));
}

export async function saveUpload(buffer: Buffer, mimetype: string): Promise<string> {
  const ext = ALLOWED_TYPES[mimetype];
  if (!ext) throw new Error(`Unsupported file type: ${mimetype}`);
  const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;

  if (bucket) {
    await bucket.file(PREFIX + name).save(buffer, {
      contentType: mimetype,
      resumable: false,
      metadata: { cacheControl: 'public, max-age=86400' },
    });
  } else {
    await fs.promises.mkdir(LOCAL_DIR, { recursive: true });
    await fs.promises.writeFile(path.join(LOCAL_DIR, name), buffer);
  }
  return `/uploads/${name}`;
}

export async function readUpload(url: string): Promise<{ data: Buffer; contentType: string } | null> {
  const name = nameFromUrl(url);
  if (!name) return null;
  const ext = path.extname(name).slice(1);
  const contentType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;

  try {
    if (bucket) {
      const [data] = await bucket.file(PREFIX + name).download();
      return { data, contentType };
    }
    const data = await fs.promises.readFile(path.join(LOCAL_DIR, name));
    return { data, contentType };
  } catch (err: any) {
    if (err?.code === 404 || err?.code === 'ENOENT') return null;
    throw err;
  }
}

/** Data URI used to embed logos/signatures into the prescription PDF HTML. */
export async function uploadAsDataUri(url: string): Promise<string | null> {
  const file = await readUpload(url);
  return file ? `data:${file.contentType};base64,${file.data.toString('base64')}` : null;
}
