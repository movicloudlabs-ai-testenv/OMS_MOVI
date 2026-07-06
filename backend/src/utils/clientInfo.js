import { UAParser } from 'ua-parser-js';
import geoip from 'geoip-lite';

/**
 * Client Info Extraction
 * Turns a raw Express request into rich, human-readable audit fields:
 * real IP, browser, OS, device type, and geo-location.
 * Used by the audit middleware and the auth controller so every log
 * is enriched consistently.
 */

// Normalize IP — strips IPv6-mapped IPv4 prefix (::ffff:) and loopback aliases
export const normalizeIp = (ip) => {
  if (!ip) return null;
  if (ip === '::1' || ip === '::ffff:127.0.0.1') return '127.0.0.1';
  if (ip.startsWith('::ffff:')) return ip.slice(7);
  return ip;
};

// Two-letter country code → flag emoji (regional indicator symbols)
const countryToFlag = (code) => {
  if (!code || code.length !== 2) return '';
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
};

// Is this a private / loopback address that has no meaningful geo?
const isPrivateIp = (ip) => {
  if (!ip) return true;
  return (
    ip === '127.0.0.1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)
  );
};

/**
 * Extract enriched client info from a request.
 * @param {import('express').Request} req
 * @returns {{ ipAddress, userAgent, browser, os, device, location, country, countryFlag }}
 */
export const getClientInfo = (req) => {
  const ipAddress = normalizeIp(req.ip);
  const userAgent = req.headers['user-agent'] || '';

  // ── Parse User-Agent ──
  const ua = new UAParser(userAgent);
  const b = ua.getBrowser();
  const o = ua.getOS();
  const d = ua.getDevice();

  const browser = b.name
    ? `${b.name}${b.version ? ` ${b.version.split('.')[0]}` : ''}`.trim()
    : 'Unknown';
  let os = o.name ? `${o.name}${o.version ? ` ${o.version}` : ''}`.trim() : 'Unknown';
  const device = d.type
    ? d.type.charAt(0).toUpperCase() + d.type.slice(1)
    : 'Desktop';

  // ── Refine Windows version via Client Hints ──
  // Windows 10 and 11 BOTH send "Windows NT 10.0" in the UA string, so the
  // parser can't tell them apart. Chromium exposes the true version through
  // the Sec-CH-UA-Platform-Version high-entropy hint: >= 13 means Windows 11.
  if (o.name === 'Windows') {
    const platform = (req.headers['sec-ch-ua-platform'] || '').replace(/"/g, '');
    const rawVer = (req.headers['sec-ch-ua-platform-version'] || '').replace(/"/g, '');
    if (platform === 'Windows' && rawVer) {
      const major = parseInt(rawVer.split('.')[0], 10);
      if (!Number.isNaN(major)) {
        os = major >= 13 ? 'Windows 11' : major > 0 ? 'Windows 10' : os;
      }
    }
  }

  // ── Geo-location ──
  let location = null;
  let country = null;
  let countryFlag = '';
  if (!isPrivateIp(ipAddress)) {
    const geo = geoip.lookup(ipAddress);
    if (geo) {
      country = geo.country || null;
      countryFlag = countryToFlag(geo.country);
      const parts = [geo.city, geo.country].filter(Boolean);
      location = parts.length ? parts.join(', ') : null;
    }
  } else {
    location = 'Local';
  }

  return { ipAddress, userAgent, browser, os, device, location, country, countryFlag };
};
