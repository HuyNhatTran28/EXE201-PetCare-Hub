export const cleanAddressDisplay = (address: string | null | undefined): string => {
  if (!address) return 'Chưa có địa chỉ';

  const normalize = (str: string) => {
    let current = str.toLowerCase().trim();
    let prev = '';
    while (current !== prev) {
      prev = current;
      current = current.replace(/^(phường\/xã|quận\/huyện|phường|xã|thị trấn|quận|huyện|thành phố|tỉnh|tp\.|tp|q\.|q|p\.|p)\s*/i, '').trim();
    }
    return current.replace(/\s+/g, '');
  };

  const cleanPartForDisplay = (part: string): string => {
    let cleaned = part.trim();
    
    // 1. Strip bulky "Phường/Xã" or "Quận/Huyện" prefixes
    cleaned = cleaned.replace(/^(phường\/xã|phường\/ xã|phường \/ xã)\s*/i, '');
    cleaned = cleaned.replace(/^(quận\/huyện|quận\/ huyện|quận \/ huyện)\s*/i, '');
    
    // Normalize extra spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // 2. Clean nested/redundant word combinations
    cleaned = cleaned.replace(/^quận\s+quận\s+/i, 'Quận ');
    cleaned = cleaned.replace(/^quận\s+q\.?\s*(\d+)/i, 'Quận $1');
    cleaned = cleaned.replace(/^phường\s+phường\s+/i, 'Phường ');
    cleaned = cleaned.replace(/^phường\s+p\.?\s*(\d+)/i, 'Phường $1');
    cleaned = cleaned.replace(/^phường\s+xã\s+/i, 'Phường ');
    cleaned = cleaned.replace(/^xã\s+xã\s+/i, 'Xã ');
    cleaned = cleaned.replace(/^huyện\s+huyện\s+/i, 'Huyện ');
    
    // 3. Shorthand replacement: Q12 -> Quận 12, P4 -> Phường 4
    cleaned = cleaned.replace(/^q\.?\s*(\d+)/i, 'Quận $1');
    cleaned = cleaned.replace(/^p\.?\s*(\d+)/i, 'Phường $1');

    return cleaned.trim();
  };

  const parts = address.split(',').map(p => p.trim()).filter(p => p && p !== '—');
  const seenNormal = new Set<string>();
  const cleanParts: string[] = [];

  for (const part of parts) {
    const norm = normalize(part);
    if (norm && !seenNormal.has(norm)) {
      seenNormal.add(norm);
      cleanParts.push(cleanPartForDisplay(part));
    }
  }

  return cleanParts.join(', ');
};
