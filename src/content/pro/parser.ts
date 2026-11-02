export interface ContactRecipient {
  id: string;
  name: string;
  phone: string;
  vars: Record<string, string>;
}

export interface ParsedAudienceResult {
  contacts: ContactRecipient[];
  invalid: string[];
  headers: string[];
  formatName: string;
}

/** Strips extensions (ext 123, x4) and notes in parentheses */
export function cleanPhone(raw: string): string {
  let s = String(raw || '').trim();
  // Strip trailing extension: ext 123, ext. 123, x123, extension 123
  s = s.replace(/\s*(ext|ext\.|x|extension)\s*\d+/i, '');
  // Strip trailing notes: (mobile), (cell), (home), (work)
  s = s.replace(/\s*\([^)]*\)$/, '');
  return s;
}

/** Normalizes phone string to clean digits or +E.164 */
export function normalizePhone(raw: string): string {
  const s = cleanPhone(raw);
  const digitsAndPlus = s.replace(/[^\d+]/g, '');
  if (digitsAndPlus.startsWith('+')) {
    return '+' + digitsAndPlus.slice(1).replace(/\+/g, '');
  }
  return digitsAndPlus.replace(/\+/g, '');
}

/** Checks if a string looks like a valid phone number (7 to 16 digits) */
export function looksLikePhone(s: string): boolean {
  const cleaned = cleanPhone(s);
  const digits = cleaned.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 16;
}

/** Auto-detects delimiter: comma, semicolon, or tab */
export function detectDelimiter(text: string): string {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0).slice(0, 5);
  let commaCount = 0;
  let semiCount = 0;
  let tabCount = 0;

  for (const line of lines) {
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') inQuotes = !inQuotes;
      else if (!inQuotes) {
        if (c === ',') commaCount++;
        else if (c === ';') semiCount++;
        else if (c === '\t') tabCount++;
      }
    }
  }

  if (tabCount > commaCount && tabCount > semiCount) return '\t';
  if (semiCount > commaCount && semiCount > tabCount) return ';';
  return ',';
}

/** Tokenizes CSV / TSV text respecting double quotes and escaped quotes */
export function tokenizeDelimited(text: string, delimiter = ','): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let inQuotes = false;

  // Strip UTF-8 BOM if present
  const cleanText = text.replace(/^\uFEFF/, '');

  for (let i = 0; i < cleanText.length; i++) {
    const c = cleanText[i];
    if (inQuotes) {
      if (c === '"') {
        if (cleanText[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      row.push(cur.trim());
      cur = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && cleanText[i + 1] === '\n') i++;
      row.push(cur.trim());
      rows.push(row);
      row = [];
      cur = '';
    } else {
      cur += c;
    }
  }

  if (cur || row.length) {
    row.push(cur.trim());
    rows.push(row);
  }

  return rows.filter(r => r && r.some(cell => cell.trim().length > 0));
}

/** Parses pasted text (e.g. "John Doe, 555-1234" or "John Doe: 555-1234") */
export function parsePastedList(text: string): { contacts: ContactRecipient[]; invalid: string[] } {
  const contacts: ContactRecipient[] = [];
  const invalid: string[] = [];

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) continue;

    const parts = raw.split(/[:;,\t]/).map(s => s.trim()).filter(Boolean);
    let name = '';
    let phone = '';

    for (const part of parts) {
      if (!phone && looksLikePhone(part) && /^[\d\s()+.-]+$/.test(cleanPhone(part))) {
        phone = normalizePhone(part);
      } else if (!name) {
        name = part;
      }
    }

    if (phone && looksLikePhone(phone)) {
      const firstName = name.split(/\s+/)[0] || name;
      contacts.push({
        id: `ct-${i}-${Date.now()}`,
        name,
        phone,
        vars: {
          Name: name,
          'Full Name': name,
          'First Name': firstName,
          FirstName: firstName,
          Phone: phone
        }
      });
    } else {
      invalid.push(raw);
    }
  }

  return { contacts, invalid };
}

/** Parses Apple / Google / iOS vCard (.vcf) contacts */
export function parseVCard(text: string): { contacts: ContactRecipient[]; invalid: string[]; headers: string[]; formatName: string } {
  const cards = text.split(/BEGIN:VCARD/i).filter(c => c.trim().length > 0);
  const contacts: ContactRecipient[] = [];
  const invalid: string[] = [];

  cards.forEach((card, idx) => {
    const lines = card.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let fn = '';
    let nFirst = '';
    let nLast = '';
    let phone = '';
    let email = '';
    let org = '';
    let title = '';

    for (const line of lines) {
      if (/^FN:/i.test(line)) {
        fn = line.slice(3).trim();
      } else if (/^N:/i.test(line)) {
        const parts = line.slice(2).split(';');
        nLast = parts[0]?.trim() || '';
        nFirst = parts[1]?.trim() || '';
      } else if (/^TEL/i.test(line)) {
        const val = line.split(':').slice(1).join(':').trim();
        if (!phone && looksLikePhone(val)) {
          phone = normalizePhone(val);
        } else if (/CELL|MOBILE/i.test(line) && looksLikePhone(val)) {
          phone = normalizePhone(val);
        }
      } else if (/^EMAIL/i.test(line)) {
        email = line.split(':').slice(1).join(':').trim();
      } else if (/^ORG:/i.test(line)) {
        org = line.slice(4).trim();
      } else if (/^TITLE:/i.test(line)) {
        title = line.slice(6).trim();
      }
    }

    const displayName = fn || (nFirst && nLast ? `${nFirst} ${nLast}` : nFirst || nLast);
    const firstName = nFirst || (fn ? fn.split(/\s+/)[0] : '');
    const lastName = nLast || (fn ? fn.split(/\s+/).slice(1).join(' ') : '');

    if (phone && looksLikePhone(phone)) {
      contacts.push({
        id: `ct-vcf-${idx}-${Date.now()}`,
        name: displayName,
        phone,
        vars: {
          Name: displayName || 'there',
          'Full Name': displayName || 'there',
          'First Name': firstName || displayName || 'there',
          FirstName: firstName || displayName || 'there',
          'Last Name': lastName,
          LastName: lastName,
          Phone: phone,
          ...(email ? { Email: email } : {}),
          ...(org ? { Organization: org } : {}),
          ...(title ? { Title: title } : {})
        }
      });
    } else if (displayName) {
      invalid.push(`${displayName} (no phone number)`);
    }
  });

  return {
    contacts,
    invalid,
    headers: ['Name', 'First Name', 'Last Name', 'Phone', 'Email', 'Organization', 'Title'],
    formatName: 'Apple / vCard Contacts'
  };
}

/** Parse RFC-compliant CSV/TSV text with Planning Center, church management, and spreadsheet intelligence */
export function parseCSV(text: string, overrideDelimiter?: string): ParsedAudienceResult {
  const delimiter = overrideDelimiter || detectDelimiter(text);
  const cleanRows = tokenizeDelimited(text, delimiter);

  if (cleanRows.length === 0) {
    return { contacts: [], invalid: [], headers: [], formatName: 'Empty File' };
  }

  const firstRow = cleanRows[0];
  const hasHeader = !firstRow.some(c => looksLikePhone(c) && /^[\d\s()+.-]+$/.test(cleanPhone(c)));
  const headers = hasHeader ? firstRow : firstRow.map((_, i) => `Col${i + 1}`);
  const body = hasHeader ? cleanRows.slice(1) : cleanRows;

  // Detect format / Church Management System
  const joinedHeaders = headers.map(h => h.toLowerCase()).join(' ');
  let formatName = 'Spreadsheet / CSV';
  if (
    joinedHeaders.includes('planning center') ||
    (headers.some(h => /person id/i.test(h)) && headers.some(h => /mobile phone|home phone|campus/i.test(h)))
  ) {
    formatName = 'Planning Center People';
  } else if (
    headers.some(h => /breeze/i.test(h)) ||
    (headers.some(h => /^mobile$/i.test(h)) && headers.some(h => /^home$/i.test(h)))
  ) {
    formatName = 'Breeze ChMS';
  } else if (headers.some(h => /individual id|family role|contact phone/i.test(h))) {
    formatName = 'Church Community Builder (CCB)';
  } else if (headers.some(h => /phone 1 - value|given name|family name/i.test(h))) {
    formatName = 'Google Contacts';
  } else if (delimiter === '\t') {
    formatName = 'Tab-Separated / Excel Table';
  }

  // Name columns
  const firstColIdx = headers.findIndex(h => /^first ?name$|^firstname$|^given ?name$/i.test(h));
  const lastColIdx = headers.findIndex(h => /^last ?name$|^lastname$|^surname$|^family ?name$/i.test(h));
  const nicknameColIdx = headers.findIndex(h => /^nickname$|^preferred ?name$/i.test(h));
  const fullColIdx = headers.findIndex(h => /^full ?name$|^fullname$|^name$|^contact$|^person$/i.test(h));

  // Phone columns ranked by priority (Mobile first!)
  const mobileCols = headers
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => /mobile|cell|sms/i.test(h))
    .map(x => x.i);
  const primaryCols = headers
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => /primary|main|phone ?1/i.test(h))
    .map(x => x.i);
  const genericCols = headers
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => /^(phone|phone ?number|telephone|tel)$/i.test(h))
    .map(x => x.i);
  const otherPhoneCols = headers
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => /home|work|phone ?2|tel/i.test(h))
    .map(x => x.i);

  const phoneCandidateCols = [
    ...mobileCols,
    ...primaryCols,
    ...genericCols,
    ...otherPhoneCols
  ];

  // If no headers matched phone, detect any column containing phone data
  if (phoneCandidateCols.length === 0) {
    headers.forEach((_, colIdx) => {
      if (body.some(r => looksLikePhone(r[colIdx] || ''))) {
        phoneCandidateCols.push(colIdx);
      }
    });
  }

  const contacts: ContactRecipient[] = [];
  const invalid: string[] = [];

  for (let i = 0; i < body.length; i++) {
    const r = body[i];

    // Find the best phone number for this row with fallback across phone columns
    let rawPhone = '';
    for (const colIdx of phoneCandidateCols) {
      const val = r[colIdx];
      if (val && looksLikePhone(val)) {
        rawPhone = val;
        break;
      }
    }

    // Fallback: search any cell in the row
    if (!rawPhone) {
      for (let c = 0; c < r.length; c++) {
        if (looksLikePhone(r[c])) {
          rawPhone = r[c];
          break;
        }
      }
    }

    const phone = normalizePhone(rawPhone);
    if (!phone || !looksLikePhone(phone)) {
      invalid.push(r.join(', '));
      continue;
    }

    // Determine Names
    const firstVal = firstColIdx >= 0 ? String(r[firstColIdx] || '').trim() : '';
    const lastVal = lastColIdx >= 0 ? String(r[lastColIdx] || '').trim() : '';
    const nickVal = nicknameColIdx >= 0 ? String(r[nicknameColIdx] || '').trim() : '';
    const fullVal = fullColIdx >= 0 ? String(r[fullColIdx] || '').trim() : '';

    let displayName = '';
    let firstName = '';
    let lastName = '';

    if (firstVal && lastVal) {
      displayName = `${firstVal} ${lastVal}`;
      firstName = firstVal;
      lastName = lastVal;
    } else if (fullVal) {
      displayName = fullVal;
      const parts = fullVal.split(/\s+/);
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ');
    } else if (firstVal) {
      displayName = firstVal;
      firstName = firstVal;
    } else if (lastVal) {
      displayName = lastVal;
      lastName = lastVal;
    }

    const vars: Record<string, string> = {
      Name: displayName || 'there',
      'Full Name': displayName || 'there',
      'First Name': firstName || displayName || 'there',
      FirstName: firstName || displayName || 'there',
      'Last Name': lastName,
      LastName: lastName,
      Phone: phone
    };

    if (nickVal) {
      vars['Nickname'] = nickVal;
      vars['Preferred Name'] = nickVal;
    }

    // Store remaining columns as dynamic variables
    headers.forEach((h, colIdx) => {
      if (h && r[colIdx] != null && r[colIdx].trim()) {
        vars[h] = String(r[colIdx]).trim();
      }
    });

    contacts.push({
      id: `ct-csv-${i}-${Date.now()}`,
      name: displayName,
      phone,
      vars
    });
  }

  return { contacts, invalid, headers, formatName };
}

/** Unified master parser: accepts CSV, TSV, Planning Center, vCard, or pasted lines */
export function parseAudience(text: string): ParsedAudienceResult {
  const trimmed = text.trim();
  if (trimmed.startsWith('BEGIN:VCARD') || trimmed.includes('\nBEGIN:VCARD')) {
    return parseVCard(trimmed);
  }

  if (
    trimmed.includes(',') ||
    trimmed.includes(';') ||
    trimmed.includes('\t') ||
    trimmed.includes('"') ||
    trimmed.includes('\n')
  ) {
    const csvResult = parseCSV(trimmed);
    if (csvResult.contacts.length > 0) {
      return csvResult;
    }
  }

  const pasted = parsePastedList(trimmed);
  return {
    ...pasted,
    headers: ['Name', 'First Name', 'Phone'],
    formatName: 'Pasted List'
  };
}

/** Interpolates variables into template: "Hi {Name}, your code is {Code}" */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\s*([\w\s-]+?)\s*\}/g, (match, key) => {
    const foundKey = Object.keys(vars).find(
      k => k.trim().toLowerCase() === String(key).trim().toLowerCase()
    );
    return foundKey !== undefined && vars[foundKey] !== undefined ? vars[foundKey] : match;
  });
}

/** Extracts all unique {variable} placeholders in a template */
export function extractVariables(template: string): string[] {
  const matches = template.match(/\{\s*([\w\s-]+?)\s*\}/g);
  if (!matches) return [];
  const vars = matches.map(m => m.replace(/[\{\}]/g, '').trim());
  return [...new Set(vars)];
}
