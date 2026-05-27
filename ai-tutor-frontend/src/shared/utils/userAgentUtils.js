/**
 * Parse a User-Agent string into browser and OS info.
 * @param {string} userAgent
 * @returns {{ browser: string, os: string }}
 */
export function parseUserAgent(userAgent) {
  let browser = 'Unknown';
  let os = 'Unknown';
  if (/Chrome/i.test(userAgent) && !/Edg/i.test(userAgent)) browser = 'Chrome';
  else if (/Firefox/i.test(userAgent)) browser = 'Firefox';
  else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) browser = 'Safari';
  else if (/Edg/i.test(userAgent)) browser = 'Edge';
  if (/Windows/i.test(userAgent)) os = 'Windows';
  else if (/Mac/i.test(userAgent)) os = 'macOS';
  else if (/Linux/i.test(userAgent)) os = 'Linux';
  else if (/Android/i.test(userAgent)) os = 'Android';
  else if (/iPhone|iPad/i.test(userAgent)) os = 'iOS';
  return { browser, os };
}
