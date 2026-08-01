/**
 * The desktop tracker's releases.
 *
 * One list, read by the download page and by the tracker settings, so a
 * version bump is one edit rather than three that drift.
 *
 * **These builds do not exist yet.** The server side is finished — pairing,
 * the ingest endpoint, activity samples, the hours on a contract — and the
 * client that talks to it has to be compiled and code-signed per platform,
 * which is a build pipeline and a signing certificate rather than a file that
 * can be written here. `available: false` is what makes the download page say
 * so plainly instead of offering a button that 404s, which is the version of
 * this that wastes somebody's afternoon.
 *
 * When a build exists: put it on a release, set `url` and `sha256`, flip
 * `available`. Nothing else changes.
 */
export interface DesktopBuild {
  platform: 'windows' | 'macos' | 'linux';
  label: string;
  requirement: string;
  /** The installer. Empty until there is one. */
  url: string;
  /** Published so somebody can check what they downloaded is what we built. */
  sha256: string;
  sizeMb: number | null;
  available: boolean;
}

export const DESKTOP_VERSION = '0.1.0';

export const DESKTOP_BUILDS: DesktopBuild[] = [
  {
    platform: 'windows',
    label: 'Windows',
    requirement: 'Windows 10 or later, 64-bit',
    url: '',
    sha256: '',
    sizeMb: null,
    available: false,
  },
  {
    platform: 'macos',
    label: 'macOS',
    requirement: 'macOS 12 or later, Apple silicon or Intel',
    url: '',
    sha256: '',
    sizeMb: null,
    available: false,
  },
  {
    platform: 'linux',
    label: 'Linux',
    requirement: 'AppImage, x86-64',
    url: '',
    sha256: '',
    sizeMb: null,
    available: false,
  },
];

export const anyBuildAvailable = DESKTOP_BUILDS.some((b) => b.available);
