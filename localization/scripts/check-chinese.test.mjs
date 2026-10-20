import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { scanTree } from './check-chinese.mjs'

function withSource(files, run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-chinese-audit-'))
  const emptyExceptions = path.join(root, 'empty-exceptions.json')
  fs.writeFileSync(emptyExceptions, JSON.stringify({ exceptions: [] }), 'utf8')
  try {
    for (const [name, source] of Object.entries(files)) {
      const full = path.join(root, name)
      fs.mkdirSync(path.dirname(full), { recursive: true })
      fs.writeFileSync(full, source, 'utf8')
    }
    return run(root, emptyExceptions)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

test('comments, dictionary keys and translated helper arguments are excluded', () => {
  withSource({
    'dsh-client-ui-responsive/src/client/i18n.ts':
      "const KO_MAP = { '已有词条': '등록된 항목' }\n",
    'dsh-client-ui-responsive/src/client/example.ts': [
      '// 注释内中文',
      '/* 另一种注释 */',
      "const a = tr('已有词条', 'Registered')",
      "const b = tr('正常中文', 'English', '한국어')",
      "const c = tr('遗漏中文', 'Missing')",
      "const d = '界面硬编码'",
      "const e = \u0060OK \${ko('合法原文', '정상 번역')}\u0060",
    ].join('\n'),
    'app/src/main/java/com/example/Example.kt': [
      '// 这是一条注释',
      'val a = ko("已有翻译", "이미 번역됨")',
      'val b = UiText.t(context, "原文", "English", "한국어")',
      'val c = "硬编码错误"',
      'val d = """{"message":"\${ko("嵌入原文", "임베디드 번역")}"}"""',
    ].join('\n'),
    'plugins/dsh-android-file-open/src/index.ts':
      "const INCOMING_TITLE = '临时工作区'",
  }, (root, emptyExceptions) => {
    const items = scanTree(root, { exceptionsFile: emptyExceptions }).findings
    const texts = items.map(f => f.text)
    assert.deepEqual(texts.sort(), ['遗漏中文', '界面硬编码', '硬编码错误', '临时工作区'].sort())
    assert.ok(items.some(f => f.reason === 'missing-korean-alternative'))
  })
})

test('Android default strings are omitted only if a Korean resource covers them', () => {
  withSource({
    'app/src/main/res/values/strings.xml': [
      '<resources>',
      '<!-- 原文注释 -->',
      ' <string name="covered">已翻译</string>',
      ' <string name="missing">未翻译</string>',
      '</resources>',
    ].join('\n'),
    'app/src/main/res/values-ko/strings.xml':
      '<resources><string name="covered">번역됨</string></resources>',
  }, root => {
    const texts = scanTree(root).findings.map(f => f.text)
    assert.deepEqual(texts, ['未翻译'])
  })
})

test('HTML comments are excluded but visible nodes and labels are found', () => {
  withSource({
    'app/src/main/assets/page.html': [
      '<!-- 注释文本 -->',
      '<div aria-label="帮助按钮">帮助</div>',
      '<script>// 这是注释',
      "const error = '发生错误'",
      '</script>',
    ].join('\n'),
  }, root => {
    const texts = scanTree(root).findings.map(f => f.text)
    assert.deepEqual(texts.sort(), ['帮助按钮', '帮助', '发生错误'].sort())
  })
})

test('audited exact-string exceptions are reported; stale exceptions block strict review', () => {
  withSource({
    'app/src/main/java/Example.kt': 'val title = "临时工作区"',
  }, root => {
    const exceptionsFile = path.join(root, 'exceptions.json')
    fs.writeFileSync(exceptionsFile, JSON.stringify({ exceptions: [
      { file: 'app/src/main/java/Example.kt', text: '临时工作区',
        why: 'This value is a protocol identity; rendering must use a separate localized display name.' },
      { file: 'app/src/main/java/Old.kt', text: '旧文本',
        why: 'The old path has been removed and this exception must be deleted now.' },
    ] }))
    const report = scanTree(root, { exceptionsFile })
    assert.equal(report.count, 0)
    assert.equal(report.auditedExceptions.length, 1)
    assert.equal(report.staleExceptions.length, 1)
  })
})

test('paired Chinese/Korean lookup tables are not mistaken for untranslated UI', () => {
  withSource({
    'app/src/main/java/Example.kt': 'val title = "确实未翻译"',
    'dsh-client-ui-responsive/src/client/map.ts': [
      "const COPY = new Map([['中文索引', '中文说明']])",
      "const COPY_EN = new Map([['中文索引', 'English']])",
      "const COPY_KO = new Map([['中文索引', '한국어 설명']])",
      "const INCOMPLETE = new Map([['缺失索引', '缺失翻译']])",
      "const INCOMPLETE_KO = new Map([['无关索引', '다른 번역']])",
      "const ICONS = new Map([['设置', NAV_ICON], ['Settings', NAV_ICON], ['설정', NAV_ICON]])",
    ].join('\n'),
  }, root => {
    const texts = scanTree(root).findings.map(x => x.text)
    assert.ok(texts.includes('确实未翻译'))
    assert.ok(texts.includes('缺失翻译'))
    assert.ok(!texts.includes('中文说明'))
    assert.ok(!texts.includes('中文索引'))
    assert.ok(!texts.includes('设置'))
  })
})

test('template literal comments in CSS/JS are treated as comments', () => {
  withSource({
    'app/src/main/Dummy.kt': '// ok',
    'dsh-client-ui-responsive/src/client/style.css.ts': [
      'export const CSS = `',
      '/* 纯注释内容 */',
      '.selector { color: red; }',
      '// 行内注释',
      'const url = "https://example.com/path";',
      '`',
    ].join('\n'),
    'dsh-client-ui-responsive/src/client/real.ts': [
      'export const A = `未翻译内容`',
    ].join('\n'),
  }, root => {
    const items = scanTree(root).findings
    const texts = items.map(f => f.text)
    assert.deepEqual(texts, ['未翻译内容'])
  })
})

test('regex literals containing quotes do not break string lexing or comment handling', () => {
  withSource({
    'app/src/main/Dummy.kt': '// ok',
    'plugins/example/src/index.ts': [
      'const ATTR_RE = /([a-zA-Z-]+)="([^"]*)"/g',
      '// 注释内中文不应被误判为字符串',
      '/* 块注释内中文也不应被误判 */',
      'const valid = "必须翻译的字符串"',
    ].join('\n'),
  }, root => {
    const items = scanTree(root).findings
    const texts = items.map(f => f.text)
    assert.deepEqual(texts, ['必须翻译的字符串'])
  })
})

test('template literals containing nested backticks inside expressions do not break comment lexing', () => {
  withSource({
    'app/src/main/Dummy.kt': '// ok',
    'plugins/example/src/index.ts': [
      'export function shellQuote(raw: string): string {',
      "  return `'${raw.replace(/'/g, `'\\''`)}'`",
      '}',
      '/**',
      ' * 构造一次键盘广播命令。',
      ' * `-n` 是关键：注释内部包含反引号',
      ' */',
      'const untranslated = "遗漏的字符串"',
    ].join('\n'),
  }, root => {
    const items = scanTree(root).findings
    const texts = items.map(f => f.text)
    assert.deepEqual(texts, ['遗漏的字符串'])
  })
})
