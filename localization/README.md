# 한국어 패치 유지보수 가이드

> [저장소 첫 화면](../README.md) · [Actions 워크플로](../.github/workflows/ko-upstream-apk.yml) · [패치 목록](patches/)
>
> **이 문서가 한국어 포크의 단일 작업 기준입니다.** 기존 원본 저장소의 AGENTS·README·출시 스크립트는 원본 개발 이력이며, 현재 한국어 APK 배포 명령을 대신하지 않습니다.

## 1. 구조와 범위

| 요소 | 기준 |
| --- | --- |
| 대상 저장소 | `min6436k/dsh-mobile-apk-Ko-KR-Patch` |
| 수정 브랜치 | `ko-patch` (PR을 거쳐 병합); 포크 `main` 수정 금지 |
| 원본 소스 | `kelai141/dsh-mobile-apk`의 최신 `main` |
| 코드 변경 | `localization/patches/*.patch`만 배포에 사용 |
| 정적 검사 | `localization/scripts/check-chinese.mjs` 및 테스트 |
| 예외 등록 | `localization/chinese-scan-exceptions.json` |
| 자동 빌드 | `.github/workflows/ko-upstream-apk.yml` (ARM64만) |
| 배포 파일 | Draft Release의 APK / SHA-256 / 출처 파일 |

패치 번호 순서는 파일 이름 사전순입니다. 현재 `001`~`180`의 **19개 `.patch`**를 사용하며 숫자 중간의 빈 자리는 새 번호를 위해 예약하지 않았습니다. 적용 순서와 파일의 실제 존재 여부는 `find localization/patches -name '*.patch' | sort`로 확인하세요. 최신 업스트림이 변하면 패치 충돌을 먼저 수정하고 전체를 재검증합니다.

### 현재 패치 목록 (파일명순)

| 파일 | 목적 |
| --- | --- |
| `001-android-ko.patch` | Android 리소스·네이티브 화면의 한국어화 |
| `010-client-ui-ko.patch` | WebView 반응형 UI 한국어화 |
| `020-host-web-compat-ko.patch` | 웹 호환 계층의 한국어화 |
| `030-plugins-ko.patch` | 내장 플러그인의 한국어화 |
| `040-color-mode.patch` | 라이트/다크/시스템 색상 모드 |
| `050-security-hardening.patch` | 부팅·복구 동의 및 업데이트 경로 등 보안 개선 |
| `060-code-map.patch` | 새 코드의 업스트림 실행 지도 등록 |
| `070-boot-contention.patch` | 초기화 중복 시작 경합 처리 |
| `080-theme-vector-icons.patch` | 태양·달·모니터 단색 벡터 아이콘 |
| `090-tests-ko.patch` | 한국어 UI 테스트 추가 |
| `100-full-ko-review.patch` | 누락 번역 전수 보완과 워크스페이스 표시명 |
| `110-pure-keymap.patch` | 가상 키맵 순수 로직 회귀 복구 |
| `120-android-compile-repair.patch` | Android Kotlin 컴파일 호환성 보완 |
| `130-kotlin-localized-contract-tests.patch` | 한국어화 이후 Kotlin 계약 테스트 수정 |
| `140-language-documents-theme.patch` | (구형) 언어 선택 팝업, 색상 모드 버튼 정렬, SAF 앱 내부 파일 DocumentsProvider |
| `150-korean-only.patch` | 관리 센터·Web UI 언어 선택 제거, 한국어 강제 적용 및 구형 선택값 무시 |
| `160-korean-process-locale.patch` | 모든 Android 앱 프로세스의 한국어 기본 언어 적용, 구형 JVM 문구 계약 테스트 보존 |
| `170-document-provider-app-name.patch` | 파일 앱의 제공자 표시를 앱 이름으로 통일하고 부제 제거 |
| `180-scoped-package-visibility.patch` | 전체 앱 조회 권한 제거, 필요한 관리자·파일 처리 앱만 조회 |

패치를 제거·합칠 때는 적용 순서와 기존 테스트의 기대 동작을 먼저 확인하세요. 원본 파일의 대량 복사는 허용하지 않습니다.

범위는 Android 네이티브 앱, WebView용 반응형 UI, 웹 호환 레이어, APK에 내장하는 Android 플러그인입니다. **외부 DeepSeek Harness 엔진 전체**나 설치 후 사용자가 추가한 플러그인은 이 포크의 번역 보증 범위가 아닙니다.

## 2. Oracle 단일 작업 디렉터리

**작업 루트:** `/home/ubuntu/project/dsh-mobile-apk-Ko-KR-Patch`

```text
dsh-mobile-apk-Ko-KR-Patch/
├── .github/workflows/ko-upstream-apk.yml
├── localization/
│   ├── README.md
│   ├── chinese-scan-exceptions.json
│   ├── patches/                 # 순서대로 적용할 코드 차분
│   └── scripts/                 # 검사기와 테스트
└── .workspace/                  # Git 제외: 원본 worktree, 보고서, 복구 자료
```

원본 체크아웃은 `.workspace/source/` 아래에 두고, 검증용 worktree는 `.workspace/` 아래 **새 디렉터리**로 만듭니다. `.workspace/source/`는 과거의 미커밋 번역 작업이 남아 있을 수 있습니다. 이미 존재하는 worktree에 대해 `git reset --hard`, `git clean -fd`를 실행하거나 덮어쓰지 마세요. 이전 폴더 `/home/ubuntu/dsh-ko-*`, `/home/ubuntu/project/ko-source`, `/home/ubuntu/project/ko-patches`를 재생성하지 마세요.

### 한국어 전용 정책 (2026-10-21)

- 관리 센터와 내장 Web UI 설정의 언어 선택 UI는 **모두 제거**합니다.
- 앱의 리소스, WebView의 locale bootstrap, 엔진 프로필 `locale.preference`, 내장 플러그인 표시 언어는 **항상 한국어**입니다. 휴대전화의 언어나 과거 선택값을 따르지 않습니다.
- 이전 `ui_language` 저장값은 실행 시 한국어로 정규화하며, 기존 작업 공간·세션·모델 자격 증명 및 다른 엔진 설정은 보존합니다.
- 호환성을 위해 남겨 둔 JS 브리지 언어 setter는 입력값에 관계없이 한국어를 반환하는 비활성 경로이며, 외부에서 영어·중국어로 전환할 수 없습니다.
- 다른 언어를 위한 중국어 원문/영어 폴백은 프로토콜과 업스트림 호환성 목적이 있는 경우에만 유지합니다.
- `KoreanOnlyApplication`이 Android 프로세스 시작 시 `Locale.KOREAN`을 설정합니다. Android Application이 실행되지 않는 순수 JVM 테스트에서는 중국어 원문 계약을 별도로 검증해 기존 테스트를 삭제하지 않습니다. 이는 사용자 설정이 아닙니다. 새 UI 표시 문구는 한국어로 작성합니다.

## 3. 패치를 적용한 깨끗한 원본에서 검사

아래는 **이미 존재하는** `.workspace/source/` Git 저장소를 기준으로 한 안전한 예제입니다. `<새-검증-폴더>`는 아직 존재하지 않는 디렉터리 이름으로 바꾸세요.

```bash
cd /home/ubuntu/project/dsh-mobile-apk-Ko-KR-Patch
ROOT="$PWD"
git -C .workspace/source fetch origin main
TREE="$ROOT/.workspace/<새-검증-폴더>"
git -C .workspace/source worktree add --detach "$TREE" origin/main

for patch in "$ROOT"/localization/patches/*.patch; do
  git -C "$TREE" apply --check --binary --whitespace=error "$patch"
  git -C "$TREE" apply --binary --whitespace=error "$patch"
done
git -C "$TREE" diff --check

node --test localization/scripts/check-chinese.test.mjs
node localization/scripts/check-chinese.mjs "$TREE" --markdown > "$ROOT/.workspace/chinese-audit.md"
node localization/scripts/check-chinese.mjs "$TREE" --json > "$ROOT/.workspace/chinese-audit.json"
node localization/scripts/check-chinese.mjs "$TREE" --strict
```

이 예제는 `origin/main`을 신뢰할 수 있는 업스트림 원격으로 설정한 **작업용 소스 저장소**가 있을 때만 유효합니다. 시작 전에 `git -C .workspace/source remote -v`로 `origin`이 `kelai141/dsh-mobile-apk`인지 확인하세요. 원격이 다르면 잘못된 소스를 사용하지 말고 올바른 업스트림 원격으로 교정해야 합니다. 기존 검증 폴더 이름을 다시 쓰지 마세요.

CI도 동일하게 깨끗한 원본을 체크아웃한 뒤 `.patch`를 순서대로 적용하고, 검사기 테스트 및 `--strict`를 APK 컴파일 **이전**에 실행합니다. 이전 로컬 번역 작업본의 결과를 보고 완료로 주장하면 안 됩니다.

## 4. 중국어 번역·내부 식별자 정책

한국어 화면에 사용자가 볼 수 있는 중국어를 남기지 않습니다. 다음 범위를 모두 확인하세요.

- Android 화면·리소스·알림·복구·권한 안내·접근성 설명·콘솔 및 오류 메시지
- WebView UI의 제목·버튼·ARIA·placeholder·동적 문자열
- 내장 플러그인의 사용자/모델 도구 응답, 작업 공간과 세션 표시명
- 한국어 표시로 연결되지 않은 다국어 호출과 신규 업스트림 화면

검사기는 주석, 정상적인 중국어 로케일 원문, 대응하는 한국어 번역이 확인된 조회 사전 및 다국어 호출을 제외합니다. **단독 중국어 문자열과 내부 식별자는 감지**합니다. `label`·`labelKo`와 같이 동일 객체에서 언어별 필드가 대응하는 순수 키맵도 한국어 항목이 실재하는지를 확인합니다.

**내부 식별자라서 그냥 무시하면 안 됩니다.** 예를 들어 이전 버전의 `临时工作区`는 내부 작업 공간 조회에 쓰이면서 **실제 화면 제목**으로도 노출됐습니다. 해결 시에는 다음을 모두 확인합니다.

1. 기존 ID, 경로, 세션 연결과 저장된 중국어 제목을 손실 없이 재사용합니다.
2. 새로 등록하는 작업 공간과 이전 중국어 제목 모두 한국어로 **표시**합니다.
3. 기존 중국어 제목도 한국어 화면에는 `임시 작업 공간`으로 보이게 하되 사용자 메시지·코드·파일명은 무단 변환하지 않습니다.
4. 앱은 **한국어 전용**입니다. 과거 중국어·영어·시스템 선택값은 무시하고 데이터 자체는 보존합니다.

`chinese-scan-exceptions.json`은 **검출되지 않는 화이트리스트가 아닙니다.** 중국어 원문은 `totalDetected`와 `auditedExceptions`에 계속 집계하며, 기술적으로 보존이 필요한 후보도 검증해야 합니다. 예외에는 `file`, `text`, 상세한 `why`, 허용된 `category`, 실제 테스트 소스 경로인 `verifiedBy`가 필요합니다. 근거·테스트 없는 예외는 `unverifiedExceptions`로 남고 `--strict`가 실패합니다.

**완료 조건:** `findings` 0건, `staleExceptions` 0건, `unverifiedExceptions` 0건, 검사기 테스트 통과. `auditedExceptions`는 0이어야 하는 값이 아니라 **하나씩 사유와 런타임 동작을 검증해야 하는 목록**입니다. 검사기 자체의 누락 패턴은 범위 축소가 아닌 검사기와 회귀 테스트 추가로 해결하세요. 기기 실행 검증은 별도입니다.

## 5. 새 번역 패치 생성 및 제출

1. 최신 업스트림을 검증용 worktree에 받은 후 **기존 17개 패치를 먼저 적용**합니다.
2. 번역·기능 수정을 해당 worktree에서 수행합니다. 한국어와 영어·중국어를 보존하고, API/JSON 키, 출력 프로토콜, URL, 경로, 플레이스홀더는 함부로 변경하지 않습니다.
3. 수정한 파일을 검토하고 `git diff --check` 및 관련 npm·Kotlin 테스트를 실행합니다.
4. 변경분을 `git -C "$TREE" diff --binary > "$ROOT/localization/patches/<다음-번호>-설명.patch"`로 추출합니다. 신규 파일은 먼저 `git -C "$TREE" add -N <새-파일>`로 diff에 포함시키거나, 임시 커밋에서 기준 커밋과 비교해 누락 없이 추출합니다.
5. **별도의 깨끗한 검증용 worktree**에 모든 패치를 처음부터 적용하고 `--strict`, 관련 앱·플러그인 테스트, 패키징 검사를 다시 실행합니다. 원본 소스 전체를 포크에 커밋하지 않습니다.
6. 작업 브랜치에 `.patch`, 검사기·예외 파일, 가이드 변경만 커밋하고 `ko-patch` 대상으로 PR을 엽니다. PR 검사 결과를 확인한 뒤 병합합니다.

검증 중 발견한 누락은 `localization/patches`에 반영되어야 **APK에 반영**됩니다. 지난 작업에서 AGY가 번역을 소스 작업본에만 남기고 배포 패치를 재생성하지 않아 사용자에게 중국어가 노출됐던 문제를 반복하지 마세요.

## 6. Actions, 릴리스, 정리

- 패치 파일을 `ko-patch`에 푸시하면 ARM64 빌드가 자동으로 시작됩니다. 매일 03:15 KST에는 최신 업스트림을 확인하며, 수동 실행 시 `force=true`로 새 빌드를 강제할 수 있습니다.
- Actions 순서: 원본 체크아웃 → 패치 적용 → **중국어 미번역 강제 검사** → Kotlin 단위 테스트 → 내장 플러그인 빌드 → Termux 스냅샷 → APK 빌드·서명 → Draft Release 업로드.
- 성공한 Draft에는 `dsh-ko-arm64.apk`, `dsh-ko-arm64.apk.sha256`, `KO-BUILD-SOURCES.txt`가 있어야 합니다. APK 해시와 기록된 업스트림/패치 SHA가 정확히 일치하는지 확인합니다.
- APK 서명은 원본의 `repoDebug` 인증서 기반입니다. 정식 앱 스토어 배포 인증서라고 소개하지 않습니다.
- 공개 게시 전 실기기 설치, 첫 실행·기존 데이터 마이그레이션, 색상 모드, 작업 공간 표시명, 복구 동의, 내장 플러그인 및 업데이트 경로를 확인합니다. **APK 성공은 기기 테스트 성공이 아닙니다.**
- 과거 릴리스와 Actions 실행 기록 삭제는 새 릴리스가 성공적으로 생성되고 확인된 **후에만** 합니다. Actions 기록 삭제는 되돌리기 어렵습니다. 다른 워크플로나 `main` 릴리스를 일괄 삭제하지 마세요.

**중요:** 이 워크플로는 패치 내용을 바꾸지 않은 문서 커밋도 `ko-patch` Git SHA가 달라지면 다음 예약 실행 때 새 릴리스 ID를 만들 수 있습니다. 패치 변경 없이 원본 문서만 수정한 것을 신규 앱 기능이라고 소개하지 마세요.

## 7. 유지보수 파일 정리 범위

한국어 포크에서 실제 사용하지 않는 구형 테스트·배포 스크립트와 오래된 인수인계 문서는 정리합니다. 반면 업스트림 소스 검증과 직접 연결된 `scripts/check-*.mjs`, `docs/AGENTS/EXECUTION-MAP.md`, 인증·라이선스 문서, PR 검사기는 **외부 참조가 있으므로 임의로 삭제하지 않습니다**. 한국어 APK Actions는 포크에 남아 있는 업스트림 스크립트를 실행하는 대신 최신 원본을 체크아웃해 원본의 빌드 스크립트를 실행합니다.

작업 중에는 `.workspace/archive/`의 미완료 차분 및 기타 복구 자료를 함부로 지우지 않습니다. Git 추적된 구형 파일만 의존성 확인 후 삭제하며, 작업 디렉터리·기기 데이터·과거 세션은 이 정리의 대상이 아닙니다.
