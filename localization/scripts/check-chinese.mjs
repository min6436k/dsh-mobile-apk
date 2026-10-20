#!/usr/bin/env node
/**
 * Find untranslated Han text in the app's owned runtime source.
 *
 * Excludes lexical comments, translation dictionaries, already-localized
 * helper arguments, and Android default resources covered by values-ko.
 * This is a high-signal static audit, not a proof of runtime UI language.
 *
 * Usage: node localization/scripts/check-chinese.mjs /path/to/patched-source
 *        node localization/scripts/check-chinese.mjs /path/to/patched-source --json
 *        node localization/scripts/check-chinese.mjs /path/to/patched-source --strict
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HAN = /\p{Script=Han}/u
const EXT = /\.(?:kt|java|ts|tsx|js|jsx|html|xml|json)$/i
const ROOTS = [
  'app/src/main/java/',
  'app/src/main/assets/',
  'app/src/main/res/',
  'dsh-client-ui-responsive/src/',
  'dsh-host-web-compat/src/',
  'dsh-host-web-compat/lib/',
]
const SKIP_PARTS = /(?:^|\/)(?:test|tests|__tests__|__fixtures__|fixtures|node_modules|dist|build|generated|\.gradle)(?:\/|$)/i
const DICTIONARIES = [
  /(?:^|\/)DsLocale\.kt$/,
  /(?:^|\/)UserCopy\.kt$/,
  /(?:^|\/)i18n\.(?:ts|tsx|js)$/,
  /(?:^|\/)[^/]*\.locales\.(?:ts|tsx|js)$/,
  /(?:^|\/)locales\.(?:ts|tsx|js)$/,
  /(?:^|\/)values-zh(?:-[^/]+)?\//,
]
const DEFAULT_EXCEPTIONS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)), '../chinese-scan-exceptions.json',
)

function isSource(file) {
  if (!EXT.test(file) || SKIP_PARTS.test(file)) return false
  if (DICTIONARIES.some(rule => rule.test(file))) return false
  if (file.startsWith('plugins/')) return /^plugins\/[^/]+\/src\//.test(file)
  if (!ROOTS.some(root => file.startsWith(root))) return false
  // Prefer host-compat authoring source if it exists; the JS library is built output.
  return true
}

function filesAt(root) {
  try {
    const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
      cwd: root, encoding: 'utf8', maxBuffer: 25 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).split('\0').filter(Boolean)
    return files.filter(isSource).sort()
  } catch {
    const found = []
    function walk(dir) {
      if (!fs.existsSync(dir)) return
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name)
        const rel = path.relative(root, file).split(path.sep).join('/')
        if (entry.isDirectory()) {
          if (!SKIP_PARTS.test(rel + '/')) walk(file)
        } else if (isSource(rel)) found.push(rel)
      }
    }
    for (const prefix of [...ROOTS, 'plugins/']) walk(path.join(root, prefix))
    return [...new Set(found)].sort()
  }
}

function lineOf(source, offset) {
  let line = 1
  for (let i = 0; i < offset; i++) if (source[i] === '\n') line++
  return line
}

/**
 * Lightweight string/comment lexer, sufficient for source localization scans.
 * Crucially, a comment containing quotation marks cannot become a string.
 */
function lex(source) {
  const out = []
  let i = 0
  while (i < source.length) {
    const a = source[i], b = source[i + 1]
    if (source.startsWith('<!--', i)) {
      const end = source.indexOf('-->', i + 4)
      i = end < 0 ? source.length : end + 3
      continue
    }
    if (a === '/' && b === '/') {
      const end = source.indexOf('\n', i + 2)
      i = end < 0 ? source.length : end
      continue
    }
    if (a === '/' && b === '*') {
      const end = source.indexOf('*/', i + 2)
      i = end < 0 ? source.length : end + 2
      continue
    }
    if (a === '/' && b !== '/' && b !== '*') {
      const last = out.length ? out[out.length - 1] : null
      const isRegex = !last || (last.type === 'punct' && !')]}'.includes(last.value)) ||
        (last.type === 'id' && ['return', 'typeof', 'case', 'delete', 'throw', 'void', 'yield', 'in', 'instanceof'].includes(last.value))
      if (isRegex) {
        let j = i + 1, inClass = false
        while (j < source.length) {
          if (source[j] === '\\') { j += 2; continue }
          if (source[j] === '[') inClass = true
          else if (source[j] === ']') inClass = false
          else if (source[j] === '/' && !inClass) { j++; break }
          else if (source[j] === '\n') break
          j++
        }
        while (j < source.length && /[a-z]/i.test(source[j])) j++
        out.push({ type: 'regex', value: source.slice(i, j), start: i, end: j })
        i = j
        continue
      }
    }
    const triple = source.startsWith('"""', i)
    if (triple || a === '"' || a === "'" || a === '\u0060') {
      const start = i
      const delimiter = triple ? '"""' : a
      i += delimiter.length
      const bodyStart = i
      if (delimiter === '\u0060') {
        const stack = ['\u0060']
        while (i < source.length && stack.length > 0) {
          const top = stack[stack.length - 1]
          if (top === '\u0060') {
            if (source[i] === '\\') { i += 2; continue }
            if (source[i] === '$' && source[i + 1] === '{') {
              stack.push('{'); i += 2; continue
            }
            if (source[i] === '\u0060') {
              stack.pop(); i++; continue
            }
            i++
          } else if (top === '{') {
            const c = source[i]
            if (c === '\\') { i += 2; continue }
            if (c === "'" || c === '"' || c === '\u0060') {
              stack.push(c); i++; continue
            }
            if (c === '/') {
              let j = i + 1, inClass = false
              while (j < source.length) {
                if (source[j] === '\\') { j += 2; continue }
                if (source[j] === '[') inClass = true
                else if (source[j] === ']') inClass = false
                else if (source[j] === '/' && !inClass) { j++; break }
                else if (source[j] === '\n') break
                j++
              }
              while (j < source.length && /[a-z]/i.test(source[j])) j++
              i = j
              continue
            }
            if (c === '{') stack.push('{')
            else if (c === '}') stack.pop()
            i++
          } else if (top === "'" || top === '"') {
            if (source[i] === '\\') { i += 2; continue }
            if (source[i] === top) stack.pop()
            i++
          }
        }
      } else {
        while (i < source.length) {
          if (!triple && source[i] === '\\') { i += 2; continue }
          if (source.startsWith(delimiter, i)) break
          i++
        }
      }
      const value = source.slice(bodyStart, delimiter === '\u0060' ? i - 1 : i)
      if (delimiter !== '\u0060') i = Math.min(source.length, i + delimiter.length)
      // Strings may embed Kotlin/JS expressions: \${ko("原文", "번역")}.
      // Mask these expressions in the outer literal and tokenize the nested
      // expression independently, so its translation helper can be recognized.
      const nested = []
      const literal = value.split('')
      for (let j = 0; j < value.length - 1; j++) {
        if (value[j] !== '$' || value[j + 1] !== '{') continue
        let depth = 1, k = j + 2, quote = ''
        for (; k < value.length && depth > 0; k++) {
          const c = value[k]
          if (quote) {
            if (c === '\\') { k++; continue }
            if (c === quote) quote = ''
          } else if (c === "'" || c === '"') quote = c
          else if (c === '{') depth++
          else if (c === '}') depth--
        }
        if (depth !== 0) continue
        const fragment = value.slice(j + 2, k - 1)
        for (const t of lex(fragment)) nested.push({
          ...t, start: bodyStart + j + 2 + t.start, end: bodyStart + j + 2 + t.end,
        })
        for (let p = j; p < k; p++) if (literal[p] !== '\n') literal[p] = ' '
        j = k - 1
      }
      if (delimiter === '\u0060' || triple) {
        let inBlock = false, inLine = false, inHtml = false
        for (let p = 0; p < literal.length; p++) {
          if (!inBlock && !inLine && !inHtml) {
            if (literal[p] === '/' && literal[p + 1] === '*') { inBlock = true; literal[p] = ' '; literal[p + 1] = ' '; p++; continue }
            if (literal[p] === '<' && literal[p + 1] === '!' && literal[p + 2] === '-' && literal[p + 3] === '-') {
              inHtml = true; literal[p] = ' '; literal[p + 1] = ' '; literal[p + 2] = ' '; literal[p + 3] = ' '; p += 3; continue
            }
            if (literal[p] === '/' && literal[p + 1] === '/' && (p === 0 || /\s|[;{}(),]/.test(literal[p - 1]))) {
              inLine = true; literal[p] = ' '; literal[p + 1] = ' '; p++; continue
            }
          } else if (inBlock) {
            if (literal[p] === '*' && literal[p + 1] === '/') { inBlock = false; literal[p] = ' '; literal[p + 1] = ' '; p++; continue }
            if (literal[p] !== '\n') literal[p] = ' '
          } else if (inHtml) {
            if (literal[p] === '-' && literal[p + 1] === '-' && literal[p + 2] === '>') { inHtml = false; literal[p] = ' '; literal[p + 1] = ' '; literal[p + 2] = ' '; p += 2; continue }
            if (literal[p] !== '\n') literal[p] = ' '
          } else if (inLine) {
            if (literal[p] === '\n') { inLine = false; continue }
            literal[p] = ' '
          }
        }
      }
      out.push({ type: 'string', value: literal.join(''), start, end: i }, ...nested)
      continue
    }
    if (/[A-Za-z_$]/.test(a)) {
      const start = i++
      while (i < source.length && /[A-Za-z0-9_$]/.test(source[i])) i++
      out.push({ type: 'id', value: source.slice(start, i), start, end: i })
      continue
    }
    if ('()[]{},.:?=;!&|+-*<>'.includes(a)) out.push({ type: 'punct', value: a, start: i, end: i + 1 })
    i++
  }
  return out
}

function callee(tokens, before) {
  if (before < 0 || tokens[before].type !== 'id') return ''
  const names = [tokens[before].value]
  let i = before - 1
  while (i >= 1 && tokens[i].value === '.' && tokens[i - 1].type === 'id') {
    names.unshift(tokens[i - 1].value)
    i -= 2
  }
  return names.join('.')
}

function callsIn(tokens) {
  const stack = [], calls = []
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if ('([{'.includes(token.value) && token.type === 'punct') {
      const callName = token.value === '(' ? callee(tokens, i - 1) : ''
      stack.push({ opener: token.value, start: i, args: [[i + 1, null]], callName })
    } else if (token.value === ',' && token.type === 'punct' && stack.length) {
      const top = stack[stack.length - 1]
      if (top.opener === '(') {
        top.args[top.args.length - 1][1] = i
        top.args.push([i + 1, null])
      }
    } else if (')]}'.includes(token.value) && token.type === 'punct' && stack.length) {
      const expected = { ')': '(', ']': '[', '}': '{' }[token.value]
      const top = stack.pop()
      if (top.opener !== expected) { stack.length = 0; continue }
      top.args[top.args.length - 1][1] = i
      if (top.callName) calls.push({ ...top, end: i })
    }
  }
  return calls
}

/**
 * Separate BASE / BASE_EN / BASE_KO lookup tables contain Chinese identity
 * keys on purpose. Exclude only table entries that truly have a KO entry.
 */
function pairedLookupRanges(tokens) {
  const maps = new Map()
  for (let i = 0; i < tokens.length - 4; i++) {
    if (tokens[i].value !== 'const' || tokens[i + 1].type !== 'id') continue
    const name = tokens[i + 1].value
    if (!/^[A-Z][A-Z0-9_]+$/.test(name)) continue
    let eq = i + 2
    while (eq < Math.min(tokens.length, i + 35) && tokens[eq].value !== '=') eq++
    if (tokens[eq]?.value !== '=') continue
    const open = tokens.slice(eq + 1, eq + 12).findIndex(t => t.value === '[' || t.value === '{')
    if (open < 0) continue
    const first = eq + 1 + open
    const expected = tokens[first].value === '[' ? ']' : '}'
    let depth = 0, last = first
    for (; last < tokens.length; last++) {
      if (tokens[last].value === tokens[first].value) depth++
      if (tokens[last].value === expected && --depth === 0) break
    }
    if (last >= tokens.length) continue
    maps.set(name, { first, last })
  }
  const ranges = []
  function keysIn(entry) {
    const keys = new Set()
    const t = tokens.slice(entry.first, entry.last + 1)
    for (let i = 0; i + 2 < t.length; i++) {
      if (t[i].value === '[' && t[i + 1].type === 'string' && t[i + 2].value === ',')
        keys.add(t[i + 1].value)
      if (t[i].type === 'string' && t[i + 1].value === ':' && t[i + 2])
        keys.add(t[i].value)
    }
    return keys
  }
  for (const [name, entry] of maps) {
    if (name.endsWith('_KO') || name.endsWith('_EN')) continue
    const korean = maps.get(name + '_KO')
    if (!korean) continue
    const baseKeys = keysIn(entry), koKeys = keysIn(korean)
    if (!baseKeys.size || [...baseKeys].some(key => !koKeys.has(key))) continue
    for (const suffix of ['', '_KO', '_EN']) {
      const part = maps.get(name + suffix)
      if (part) ranges.push([part.first, part.last])
    }
  }
  return ranges
}

function multilingualKeyIndices(tokens) {
  const covered = new Set()
  for (let i = 0; i + 2 < tokens.length; i++) {
    if (tokens[i].value !== 'Map' || tokens[i + 1].value !== '(' ||
        tokens[i + 2].value !== '[') continue
    const groups = new Map()
    let depth = 0
    for (let j = i + 2; j < tokens.length; j++) {
      if (tokens[j].value === '[') depth++
      if (tokens[j].value === ']') { depth--; if (depth === 0) break }
      if (j + 4 >= tokens.length || tokens[j].value !== '[' ||
          tokens[j + 1].type !== 'string' || tokens[j + 2].value !== ',' ||
          tokens[j + 3].type !== 'id' || tokens[j + 4].value !== ']') continue
      const value = tokens[j + 3].value
      const entries = groups.get(value) ?? []
      entries.push({ index: j + 1, key: tokens[j + 1].value })
      groups.set(value, entries)
    }
    for (const entries of groups.values()) {
      if (!entries.some(e => /[\uac00-\ud7a3]/u.test(e.key))) continue
      for (const entry of entries) {
        if (HAN.test(entry.key)) covered.add(entry.index)
      }
    }
  }
  return covered
}

function translationMap(source) {
  const keys = new Set()
  // Only exact, explicit Chinese lookup keys in the reviewed registries.
  const patterns = [
    /['"]([^'"\n]*\p{Script=Han}[^'"\n]*)['"]\s*:/gu,
    /["']([^"'\n]*\p{Script=Han}[^"'\n]*)["']\s+to\s+["'][^"'\n]*["']/gu,
  ]
  for (const re of patterns) for (const m of source.matchAll(re)) keys.add(m[1])
  return keys
}

function lookupKeys(root) {
  const groups = [
    ['web', 'dsh-client-ui-responsive/src/client/i18n.ts'],
    ['android', 'app/src/main/java/com/dsharnessmobile/shell/DsLocale.kt'],
  ]
  const maps = { web: new Set(), android: new Set() }
  for (const [kind, file] of groups) {
    const full = path.join(root, file)
    if (fs.existsSync(full)) maps[kind] = translationMap(fs.readFileSync(full, 'utf8'))
  }
  return maps
}

function argContainsKorean(tokens, arg) {
  if (!arg) return false
  return tokens.slice(arg[0], arg[1]).some(t => t.type === 'string' && /[\uac00-\ud7a3]/u.test(t.value))
}

function onlyRawChinese(tokens, arg, index) {
  if (!arg) return null
  const content = tokens.slice(arg[0], arg[1])
  if (content.length === 1 && content[0].type === 'string' && content[0] === tokens[index]) return content[0].value
  return null
}

function helperDecision(tokens, index, calls, dictionaries, file) {
  const relevant = calls.filter(c => c.start < index && index < c.end)
    .sort((a, b) => b.start - a.start)
  for (const call of relevant) {
    const name = call.callName
    let zhIndex, koIndex
    if (name === 'ko' || name.endsWith('.ko') || name === 'DsLocale.tr') {
      zhIndex = 0; koIndex = 1
    } else if (name === 'UiText.t' || name.endsWith('.UiText.t')) {
      zhIndex = 1; koIndex = 3
    } else if (['tr', 't', 'both'].includes(name) || /\.(?:tr|both)$/.test(name)) {
      zhIndex = 0; koIndex = 2
    } else continue
    const argNumber = call.args.findIndex(([start, end]) => index >= start && index < end)
    if (argNumber < 0) continue
    if (argNumber !== zhIndex) return null // Inspect any suspicious Chinese in the Korean argument.
    const koArg = call.args[koIndex]
    if (koArg && koArg[0] < koArg[1]) {
      // A genuine Korean alternative is supplied. Also allow a computed alternative.
      return { skip: true, reason: 'translated-call' }
    }
    const localeMap = file.startsWith('app/') ? dictionaries.android : dictionaries.web
    const zh = onlyRawChinese(tokens, call.args[zhIndex], index)
    if (zh !== null && localeMap.has(zh)) return { skip: true, reason: 'dictionary-lookup' }
    return { skip: false, reason: 'missing-korean-alternative' }
  }
  return null
}

function pushFinding(results, file, content, offset, value, reason) {
  if (!HAN.test(value)) return
  const line = lineOf(content, offset)
  const snippet = content.split('\n')[line - 1]?.trim().slice(0, 280) ?? ''
  results.push({ file, line, text: value.trim().slice(0, 240), reason, snippet })
}

function scanCode(file, content, dictionaries) {
  const results = []
  const tokens = lex(content)
  const calls = callsIn(tokens)
  const pairedRanges = pairedLookupRanges(tokens)
  const multilingualKeys = multilingualKeyIndices(tokens)
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (token.type !== 'string' || !HAN.test(token.value)) continue
    if (pairedRanges.some(([start, end]) => i > start && i < end)) continue
    if (multilingualKeys.has(i)) continue
    const decision = helperDecision(tokens, i, calls, dictionaries, file)
    if (decision?.skip) continue
    pushFinding(results, file, content, token.start, token.value, decision?.reason ?? 'hardcoded-chinese')
  }
  return results
}

function resourceEntries(xml) {
  const entries = new Map()
  const cleaned = xml.replace(/<!--[\s\S]*?-->/g, '')
  const re = /<(string|string-array|plurals)\b([^>]*)>([\s\S]*?)<\/\1\s*>/g
  for (const match of cleaned.matchAll(re)) {
    const name = /\bname\s*=\s*["']([^"']+)["']/.exec(match[2])?.[1]
    if (name) entries.set(match[1] + ':' + name, match[3])
  }
  return entries
}

function scanXml(file, content, root) {
  const results = []
  const clean = content.replace(/<!--[\s\S]*?-->/g, match => match.replace(/[^\n]/g, ' '))
  const defaultValues = /^app\/src\/main\/res\/values\/[^/]+\.xml$/.test(file)
  const koFile = file.replace('/values/', '/values-ko/')
  const ko = defaultValues && fs.existsSync(path.join(root, koFile))
    ? resourceEntries(fs.readFileSync(path.join(root, koFile), 'utf8')) : new Map()
  const covered = []
  if (defaultValues) {
    const entryRe = /<(string|string-array|plurals)\b([^>]*)>([\s\S]*?)<\/\1\s*>/g
    for (const m of clean.matchAll(entryRe)) {
      if (!HAN.test(m[3])) continue
      const name = /\bname\s*=\s*["']([^"']+)["']/.exec(m[2])?.[1]
      const localized = name && ko.get(m[1] + ':' + name)
      const sourceItems = [...m[3].matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/g)]
      const translatedItems = localized ? [...localized.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/g)] : []
      const fullyCovered = localized && !HAN.test(localized) &&
        (sourceItems.length === 0 || sourceItems.length === translatedItems.length)
      if (fullyCovered) covered.push([m.index, m.index + m[0].length])
      else pushFinding(results, file, content, m.index, m[3].replace(/<[^>]*>/g, ''), 'android-resource-missing-ko')
    }
  }
  // Outside effective translated default strings, check attributes and text.
  const masked = clean.split('')
  for (const [start, end] of covered) for (let i = start; i < end; i++) if (masked[i] !== '\n') masked[i] = ' '
  if (defaultValues) {
    for (const m of clean.matchAll(/<(string|string-array|plurals)\b[^>]*>[\s\S]*?<\/\1\s*>/g)) {
      for (let i = m.index; i < m.index + m[0].length; i++) if (masked[i] !== '\n') masked[i] = ' '
    }
  }
  const remaining = masked.join('')
  for (const m of remaining.matchAll(/(?:["'])([^"'\n]*\p{Script=Han}[^"'\n]*)(?:["'])/gu)) {
    pushFinding(results, file, content, m.index, m[1], 'xml-attribute')
  }
  for (const m of remaining.matchAll(/>([^<>]*\p{Script=Han}[^<>]*)</gu)) {
    pushFinding(results, file, content, m.index + 1, m[1], 'xml-visible-text')
  }
  return results
}

function scanHtml(file, content, dictionaries) {
  const results = scanCode(file, content, dictionaries)
  const clean = content.replace(/<!--[\s\S]*?-->/g, match => match.replace(/[^\n]/g, ' '))
    .replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi, match => match.replace(/[^\n]/g, ' '))
  for (const m of clean.matchAll(/>([^<>]*\p{Script=Han}[^<>]*)</gu)) {
    pushFinding(results, file, content, m.index + 1, m[1], 'html-visible-text')
  }
  return results
}

export function scanTree(root, options = {}) {
  const absolute = path.resolve(root)
  if (!fs.existsSync(path.join(absolute, 'app/src/main'))) {
    throw new Error('Not an app source checkout: ' + absolute)
  }
  const dictionaries = lookupKeys(absolute)
  const files = filesAt(absolute)
  const findings = []
  for (const file of files) {
    const content = fs.readFileSync(path.join(absolute, file), 'utf8')
    const results = file.endsWith('.xml') ? scanXml(file, content, absolute)
      : file.endsWith('.html') ? scanHtml(file, content, dictionaries)
        : scanCode(file, content, dictionaries)
    findings.push(...results)
  }
  // One candidate per exact file/line/text, not one per regex or scanner branch.
  const unique = [...new Map(findings.map(item => [
    [item.file, item.line, item.text].join('\0'), item,
  ])).values()]
  const exceptionFile = options.exceptionsFile ?? DEFAULT_EXCEPTIONS
  const parsed = fs.existsSync(exceptionFile)
    ? JSON.parse(fs.readFileSync(exceptionFile, 'utf8')) : { exceptions: [] }
  if (!Array.isArray(parsed.exceptions)) throw new Error('Invalid exceptions file: ' + exceptionFile)
  for (const exception of parsed.exceptions) {
    if (typeof exception.file !== 'string' || typeof exception.text !== 'string' ||
        typeof exception.why !== 'string' || exception.why.trim().length < 20) {
      throw new Error('Every exception needs file, exact Chinese text, and a concrete why (20+ chars)')
    }
  }
  const matched = new Set()
  const excluded = [], unresolved = []
  for (const item of unique) {
    const index = parsed.exceptions.findIndex(ex => ex.file === item.file && ex.text === item.text)
    if (index >= 0) {
      matched.add(index)
      excluded.push({ ...item, why: parsed.exceptions[index].why })
    } else unresolved.push(item)
  }
  const staleExceptions = parsed.exceptions.filter((_, index) => !matched.has(index))
  return {
    root: absolute, filesScanned: files.length, excludedDictionaryFiles: DICTIONARIES.map(String),
    count: unresolved.length, auditedExceptions: excluded, staleExceptions,
    findings: unresolved.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line),
  }
}

export function formatMarkdown(report) {
  const escape = value => String(value).replace(/\|/g, '\\|').replace(/[\r\n]/g, ' ')
  return [
    '# 한국어 미번역 후보 검사',
    '',
    '- 검사 소스: ' + report.root,
    '- 검사 파일 수: ' + report.filesScanned,
    '- 검토할 후보: ' + report.count,
    '- 코드 근거로 승인한 예외: ' + report.auditedExceptions.length,
    '- 더 이상 일치하지 않는 예외(정리 필수): ' + report.staleExceptions.length,
    '- 범위: Android 앱 / 앱 내 WebView / 내장 플러그인 소스',
    '- 제외: 주석, 중국어 번역 조회 사전, 완성된 다국어 호출, 한국어 리소스가 있는 기본 Android 문자열',
    '',
    '| 파일:행 | 분류 | 중국어 원문 |',
    '| --- | --- | --- |',
    ...report.findings.map(item =>
      '| ' + escape(item.file + ':' + item.line) + ' | ' + escape(item.reason) + ' | ' + escape(item.text) + ' |'),
    '',
    '## 근거가 기재된 예외',
    '',
    ...report.auditedExceptions.map(item =>
      '- ' + escape(item.file + ':' + item.line) + ' / ' + escape(item.text) + ': ' + escape(item.why)),
    '',
    '## 제거해야 할 오래된 예외',
    '',
    ...report.staleExceptions.map(item => '- ' + escape(item.file) + ': ' + escape(item.text)),
    '',
    '주의: 정적 검사 후보입니다. 실제 노출 여부를 소스 흐름으로 확인하고 전부 처리·사유 기록 후 재실행하세요.',
  ].join('\n')
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  const root = args.find(a => !a.startsWith('--')) ?? '.'
  if (args.some(a => !['--json', '--strict', '--markdown'].includes(a) && a.startsWith('--'))) {
    console.error('Usage: node check-chinese.mjs [patched-source-root] [--json|--markdown] [--strict]')
    process.exit(2)
  }
  const report = scanTree(root)
  if (args.includes('--json')) console.log(JSON.stringify(report, null, 2))
  else console.log(formatMarkdown(report))
  if (args.includes('--strict') && (report.count > 0 || report.staleExceptions.length > 0)) process.exitCode = 1
}
