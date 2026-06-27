export const cleanAddressDisplay = (address: string | null | undefined): string => {
  if (!address) return 'Chưa có địa chỉ';

  const normalize = (str: string) => {
    return str
      .toLowerCase()
      .replace(/^(phường\/xã|quận\/huyện|phường|xã|thị trấn|quận|huyện|thành phố|tỉnh|tp\.|tp|q\.|q|p\.|p)\s*/i, '')
      .replace(/\s+/g, '')
      .trim();
  };

  const parts = address.split(',').map(p => p.trim()).filter(p => p && p !== '—');
  const seenNormal = new Set<string>();
  const cleanParts: string[] = [];

  for (const part of parts) {
    const norm = normalize(part);
    if (norm && !seenNormal.has(norm)) {
      seenNormal.add(norm);
      
      // Clean formal prefixes "Phường/Xã" or "Quận/Huyện" from the part
      let cleaned = part;
      cleaned = cleaned.replace(/^(phường\/xã|phường\/ xã|phường \/ xã)\s*/i, 'Phường ');
      cleaned = cleaned.replace(/^(quận\/huyện|quận\/ huyện|quận \/ huyện)\s*/i, 'Quận ');
      cleanParts.push(cleaned.trim());
    }
  }

  return cleanParts.join(', ');
};
