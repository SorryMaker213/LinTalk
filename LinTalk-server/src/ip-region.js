const regionCache = new Map();

const IPV4_REG = /^((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.|$)){4}$/;

function normalizeIp(ip) {
  if (!ip || typeof ip !== 'string') return '';
  let value = ip.trim();
  if (!value) return '';

  // x-forwarded-for may contain multiple addresses.
  if (value.includes(',')) {
    value = value.split(',')[0].trim();
  }

  if (value.startsWith('::ffff:')) {
    value = value.slice(7);
  }
  if (value === '::1') {
    return '127.0.0.1';
  }
  return value;
}

function isIpv4(ip) {
  return IPV4_REG.test(ip);
}

function isPrivateIpv4(ip) {
  if (!isIpv4(ip)) return false;
  const [a, b] = ip.split('.').map((n) => Number(n));
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

function simplifyCnRegion(value) {
  if (!value) return '未知';
  return String(value)
    .replace(/壮族自治区|回族自治区|维吾尔自治区|特别行政区|自治区|省|市/g, '')
    .trim() || '未知';
}

async function fetchJsonWithTimeout(url, timeoutMs = 3500, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`IP query failed: ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function parseIpWhoIs(data) {
  if (!data || data.success === false) return '未知';
  const countryCode = (data.country_code || '').toUpperCase();
  if (countryCode === 'CN' || data.country === 'China' || data.country === '中国') {
    return simplifyCnRegion(data.region || data.region_name || data.city);
  }
  if (data.country) {
    return String(data.country);
  }
  return '未知';
}

function parseIpApi(data) {
  if (!data || data.status !== 'success') return '未知';
  const countryCode = (data.countryCode || '').toUpperCase();
  if (countryCode === 'CN' || data.country === 'China' || data.country === '中国') {
    return simplifyCnRegion(data.regionName || data.city);
  }
  if (data.country) {
    return String(data.country);
  }
  return '未知';
}

async function fetchRegionByIp(ip) {
  const cached = regionCache.get(ip);
  if (cached) return cached;
  let result = '未知';

  try {
    const data = await fetchJsonWithTimeout(`https://ipwho.is/${ip}`, 3500, {
      Accept: 'application/json'
    });
    result = parseIpWhoIs(data);
  } catch {
    result = '未知';
  }

  if (result === '未知') {
    try {
      const data = await fetchJsonWithTimeout(
        `http://ip-api.com/json/${ip}?lang=zh-CN&fields=status,country,countryCode,regionName,city`,
        3500,
        { Accept: 'application/json' }
      );
      result = parseIpApi(data);
    } catch {
      result = '未知';
    }
  }

  // Avoid persisting temporary network failures as a permanent unknown cache.
  if (result !== '未知') {
    regionCache.set(ip, result);
  }
  return result;
}

async function resolveIpOwnership(userType, userIp) {
  if (userType === 'bot') return '机器人';

  const normalized = normalizeIp(userIp);
  if (!normalized || normalized === '未知') return '未知';

  if (!isIpv4(normalized)) {
    // Keep existing semantic value if caller already passed a label.
    return normalized;
  }

  if (isPrivateIpv4(normalized)) {
    return '内网';
  }

  try {
    return await fetchRegionByIp(normalized);
  } catch {
    return '未知';
  }
}

module.exports = {
  resolveIpOwnership,
  normalizeIp,
  isIpv4,
  isPrivateIpv4
};
