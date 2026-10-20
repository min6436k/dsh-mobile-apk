# Ko-KR-Patch: 한국어 패치 제작 가이드

이 공개 포크는 [원본 dsh-mobile-apk](https://github.com/kelai141/dsh-mobile-apk)의 최신 `main`을 자동으로 받아, 별도 브랜치에서 관리하는 한국어 `.patch` 파일을 적용한 후 **arm64 APK 하나**를 빌드합니다.

- 자동 빌드 설정: 이 저장소의 기본 브랜치 `ko-patch` → `.github/workflows/ko-upstream-apk.yml`
- 한국어 패치 보관: 이 저장소의 **`ko-patch` 브랜치** → `localization/patches/*.patch`
- 빌드 대상: 원본 `kelai141/dsh-mobile-apk`의 최신 `main`
- 원본 추적 브랜치: 이 포크의 `main`은 업스트림 `main`과 동일한 소스만 보관하고, 번역 및 자동화는 `ko-patch`에서 관리합니다.
- 결과물: [Releases](https://github.com/min6436k/dsh-mobile-apk-Ko-KR-Patch/releases)의 **Draft(초안)** 안에 `dsh-ko-arm64.apk`, `KO-BUILD-SOURCES.txt`
- 실행: 패치 추가·변경 시 자동 / 매일 03:15(KST) 원본 변경 확인 / Actions 수동 실행

> **가장 중요한 원칙:** `ko-patch`에는 번역을 완료한 소스 파일 자체가 아니라 **소스의 변경 사항을 기록한 `.patch` 파일**을 올립니다. 자동 빌드는 원본의 깨끗한 최신 소스에 패치를 덧씌웁니다. `main` 브랜치에 한국어 파일을 직접 수정해 넣지 마세요.

## 0. 최우선 작업 규칙: 전수 조사 없이는 번역 완료가 아닙니다

> **필수 지시:** 원본에서 한국어가 표시되어야 하는 모든 사용자 화면의 중국어·미번역 문자열을 **먼저 전수 조사**하세요. 몇 가지 예시 파일만 수정하거나 APK가 빌드됐다는 이유로 한국어화 완료라고 보고하면 안 됩니다. 조사·번역·재검색·화면 검수 중 하나라도 빠지면 결과는 **부분 번역**입니다.

### 번역 전에 반드시 조사할 범위

1. **Android 네이티브 전체:** `app/src/main/java/` 아래의 Kotlin/Java, `app/src/main/res/`의 XML 및 문자열/배열, `app/src/main/assets/`의 HTML/JS. 화면 제목, 버튼, 안내, 상태·진행 메시지, 에러·복구·권한 문구, 메뉴, 알림, `contentDescription`, 다이얼로그 및 접근성 레이블까지 포함합니다.
2. **앱 내 WebView UI 전체:** `dsh-client-ui-responsive/src/` 및 실제로 앱에 주입·번들되는 웹 UI 소스. 기존 언어 사전뿐 아니라 TS/TSX/JS/JSX의 하드코딩 문자열도 찾습니다.
3. **호스트 호환 계층·번들 플러그인:** `dsh-host-web-compat/`, `plugins/` 등 APK와 런타임에 포함된 사용자 노출 텍스트. 어느 구성 요소가 실제 문구를 생성하는지 추적합니다.
4. **외부 DSH 엔진/마켓 플러그인:** APK 저장소 밖에서 렌더링되는 UI는 소스 소유 저장소를 식별해 별도 패치 필요 여부를 기록합니다. 현재 APK 패치로 못 바꾸는 항목을 임의로 완료 처리하지 마세요.

실제 누락 사례가 있었던 곳(업스트림 구조가 바뀌면 경로를 다시 확인):

| 화면/기능 | 우선 확인할 원본 파일 | 번역 누락 예시 |
| --- | --- | --- |
| 관리 센터·저장소 관리 | `app/src/main/java/com/dsharnessmobile/shell/GuideManagementController.kt` | `管理中心`, `插件管理`, `存储管理` |
| 시작·런타임 진행/복구 | `GuidePageRenderer.kt`, `EngineStartFlow.kt`, `MainActivity.kt` | `正在更新运行时`, 상태·오류 안내 |
| 내장 콘솔 | `app/src/main/assets/console.html` 및 `ConsoleActivity.kt` | `控制台`, `发送`, `输入命令` |
| 플러그인 관리 | `PluginManagementPage.kt`, 관련 네이티브 UI | 화면 제목·설명·오프라인 상태 |
| 기타 관리 UI/접근성 | `GuideChrome.kt` 및 관련 Kotlin/리소스 | 화면 전환·아이콘 설명 |

### 중국어 문자열을 찾는 방법 (필수: 전용 검사 스크립트 우선)

다음 원시 검색은 **보조 점검용**입니다. 주석과 번역 조회 사전까지 포함하므로 이 결과만으로 완료를 판정하지 마세요. 바로 아래의 **전용 검사 스크립트와 전체 후보 처리 절차가 필수**입니다.

~~~bash
rg -n --pcre2 '[\p{Han}]'   app/src/main/java app/src/main/assets app/src/main/res   dsh-client-ui-responsive/src dsh-host-web-compat plugins   --glob '*.{kt,java,xml,html,js,jsx,ts,tsx,json}'
~~~

위 정규식은 **한자 계열 문자 전체**를 찾으므로 코드 주석, 테스트 데이터, 의도적으로 남긴 중국어 번역, 외부 라이브러리 문구도 포함됩니다. **검색 결과를 수작업으로 분류**하고, 실제 사용자에게 노출되는 중국어는 번역하거나 근거 있는 제외 사유를 남기세요. 검색 결과 0건만 기계적으로 맞추려고 정상적인 중국어 로케일·주석을 삭제하면 안 됩니다.

~~~bash
rg -n '管理中心|插件管理|存储管理|正在更新运行时|控制台|输入命令'   app/src/main/java app/src/main/assets
~~~

검색으로 발견한 **원본 파일·원문·표시 화면·적용 방법·처리 상태**를 표로 정리한 다음 번역하세요. 파일 몇 개만 임의로 선정하거나 `values-ko` 한 파일만 추가하는 것은 전수 조사에 해당하지 않습니다.

### 전용 미번역 검사: 나온 항목 전부 처리할 것 (필수 · 생략 금지)

이 포크에는 **localization/scripts/check-chinese.mjs**가 있습니다. Android 앱·리소스·콘솔 HTML, WebView UI, APK 내장 플러그인 코드를 검사하여 한자가 들어 있는 **미번역 후보**를 파일:행별로 추출합니다.

자동으로 제외하는 항목:

- Kotlin/Java/TS/JS/HTML/XML의 코드 주석, 테스트·빌드 출력
- 중국어 번역 조회용 원문 사전(DsLocale.kt, UserCopy.kt, i18n.ts, locales.ts 계열), 중국어 전용 리소스
- 이미 한국어 인수가 연결된 다국어 호출(ko/UiText.t/tr 등), 정확한 한국어 사전 키가 있는 2인수 호출
- 한국어 번역 리소스(values-ko)가 실제로 제공되는 기본 Android(values) 문자열

**반드시 남기는 항목:** 한국어 대안이 없고 번역 사전에도 없는 호출, 사용자 표시 문자열, 단독 중국어 상수, 한국어 번역이 빠진 리소스. 과거 실제 누락 사례인 临时工作区, 新的修复 같은 값도 탐지해야 합니다.

2절의 작업 폴더 이름(ko-source = 원본에 패치가 적용된 소스, ko-patches = 포크 패치 저장소)을 기준으로 다음을 실행하세요.

~~~bash
cd ko-patches
node --test localization/scripts/check-chinese.test.mjs

cd ../ko-source
node ../ko-patches/localization/scripts/check-chinese.mjs . --markdown > chinese-candidates.md
node ../ko-patches/localization/scripts/check-chinese.mjs . --json > chinese-candidates.json
~~~

**최신 원본을 받았을 때 1회, 기존 한국어 패치 전체와 이번 변경을 적용한 뒤 다시 1회 실행합니다.** 최종 판정은 반드시 **실제 APK에 넣을 패치 적용 후 소스**에서 합니다. JSON의 findings를 임시 작업 목록으로 삼아 **하나도 건너뛰지 마세요.** 파일:행, 원문, 표시 화면 또는 호출 경로, 수정 방법, 수정 패치, 검증 결과를 항목별로 남깁니다.

**후보 하나하나의 필수 처리 방식**

1. 사용자가 볼 수 있는 문구(화면, 알림, 접근성, 오류/복구, 플러그인 도구 응답, 워크스페이스 제목)는 모두 **한국어 표시를 구현**하고 동작을 테스트합니다.
2. 중국어 문자열이 동시에 영속 데이터 식별자, 기존 제목 검색 키, 프로토콜 값이라면 **그 원문을 무작정 치환하지 마세요.** 식별자를 보존하면서 표시용 한국어를 분리하고, 과거에 저장된 값의 호환성·마이그레이션까지 검증합니다.
3. 의도적으로 중국어 로케일에서만 노출되거나 한국어 분기로 절대 도달하지 않는 등 **코드로 증명된 예외만** localization/chinese-scan-exceptions.json의 exceptions에 기록할 수 있습니다. 항목마다 정확한 file, text, 20자 이상의 구체적인 why를 씁니다. “내부용”, “번역 불필요” 같은 근거 없는 일괄 예외는 금지합니다. 승인된 예외도 보고서의 auditedExceptions에 나타납니다.
4. 수정 후 다시 실행합니다. **findings 0건**뿐 아니라 **staleExceptions 0건**이어야 합니다. 더 이상 존재하지 않는 예외는 삭제합니다. 검사 대상을 빼거나 중국어 사전/주석을 삭제해서 숫자만 줄이는 것은 금지합니다.

~~~bash
cd ko-source
node ../ko-patches/localization/scripts/check-chinese.mjs . --strict
~~~

strict 검사는 미처리 후보 또는 오래된 예외가 하나라도 있으면 **종료 코드 1**을 반환합니다. 통과 전에는 작업 완료·전면 한국어화를 주장하지 마세요.

정적 스캔에는 한계가 있습니다. 중국어 사용자에게만 보이는 조건 분기나 데이터 식별자도 후보로 나올 수 있으므로 개별 호출 경로를 확인하고 근거를 기록하세요. 반대로 코드로 생성되는 문구나 외부 DSH 엔진의 자체 UI는 놓칠 수 있으므로 실제 기기 화면 점검도 필수입니다. **스크립트에서 새 누락 패턴을 발견하면 스크립트와 테스트부터 보강**합니다.

### 구현 원칙

- Android 리소스화가 가능한 문구는 `values/strings.xml`에 기존 키를 유지하고 `values-ko/strings.xml`에 한국어를 제공합니다. Kotlin 코드의 중국어 하드코딩은 필요하면 문자열 리소스로 추출해 한국어 로케일에서 실제 선택되도록 연결합니다.
- HTML 및 Web UI의 하드코딩 문구도 한국어 사용자에게 한국어로 표시돼야 합니다. 기존 다국어 지원 기능과 중국어·영어 로케일은 불필요하게 훼손하지 마세요.
- **문구를 조건·상태 식별에 사용하는 코드가 있을 수 있습니다.** 특히 `console.html`은 상태 문자열과 동작이 연결될 수 있으므로 UI 텍스트를 교체할 때 판별 로직·테스트도 함께 확인합니다.
- `%1$s` 같은 Android 서식 자리표시자, `{name}` 같은 템플릿 변수, HTML/JS 이스케이프, URL/JSON·설정 키, CLI 명령어, 기술 식별자를 보존합니다.
- 번역했다고 UI 구성이나 기능을 삭제·우회하지 마세요. 불분명한 외부 플러그인 UI는 원인을 기록하고 **미완료**로 남깁니다.

### 완료 기준

**APK 빌드 성공 ≠ 번역 완료.** 다음을 충족하지 못하면 완료 보고 대신 미완료 목록과 남은 원인을 제출하세요.

- [ ] 네이티브·콘솔·웹 UI·실제 번들 플러그인 소스의 번역 대상을 전수 검색했고, 발견 결과를 분류함
- [ ] 전용 스크립트를 패치 적용 후 소스에서 실행하고, findings와 staleExceptions가 모두 0건이며 strict 검사가 통과함
- [ ] 모든 앱 소유 사용자 노출 중국어가 한국어 로케일에서 한국어로 나옴(의도적 예외는 원문·사유·화면을 기록)
- [ ] 대표 화면(시작/진행/오류, 관리 센터, 저장소, 플러그인, 콘솔, 주요 설정)의 한국어 표시 여부를 검수함
- [ ] 검색을 다시 실행해 잔여 사용자 노출 문구의 목록 및 처리/제외 사유를 제시함
- [ ] 패치 충돌 확인, 관련 테스트 및 arm64 빌드를 마침. **기기 화면을 검증하지 못했다면 미검증이라고 명시**함
- [ ] 작업 결과에 변경한 파일, 패치 이름, 번역/미번역 집계, 예외, 테스트 증거, 미완료 항목을 적음

---

## 1. 어디를 번역하나요?

| 번역 대상 | 원본에 존재하는 파일 | 권장 방법 |
| --- | --- | --- |
| Android 문자열 리소스 | `app/src/main/res/values/strings.xml` | `values-ko/strings.xml`에서 기존 키를 한국어로 제공 |
| Android 관리 센터·시작·오류·설정·플러그인 화면 | `app/src/main/java/` 아래의 Kotlin/Java (특히 `GuideManagementController.kt`, `GuidePageRenderer.kt`, `EngineStartFlow.kt`, `PluginManagementPage.kt`) | **코드에 직접 들어 있는 중국어도 전수 조사**하고 리소스화·번역 |
| 내장 콘솔 HTML | `app/src/main/assets/console.html` | 표시 문구와 문자열 의존 상태 판별을 함께 점검 |
| 앱 내 웹 UI의 브라우저 | `dsh-client-ui-responsive/src/client/mobile/upstream-browser/locales.ts` | 언어별 사전 및 언어 선택 코드 확인 후 수정 |
| 앱 내 웹 UI의 사이드바 | `dsh-client-ui-responsive/src/client/mobile/sidebar-bubbles.locales.ts` | 언어별 사전 및 언어 선택 코드 확인 후 수정 |
| 그 밖의 앱 및 번들 플러그인의 사용자 노출 텍스트 | `dsh-client-ui-responsive/src/`, `dsh-host-web-compat/`, `plugins/`의 실제 소스 | 하드코딩 문자열까지 전수 검색해 번역; 외부 엔진 UI는 별도 출처 기록 |

`values-ko` 추가만으로 WebView 내부 전체가 한국어로 바뀌지는 않습니다. **Android 문자열과 웹 UI의 언어 사전은 별도**입니다. 모델 설정창처럼 외부 엔진이나 플러그인에서 생성되는 UI라면, APK 저장소에 해당 코드가 있는지 먼저 확인해야 합니다.

## 2. 처음 패치 만들기 (Windows Git Bash / macOS / Linux)

### 준비: Git과 텍스트 편집기

Windows에서는 **Git Bash**를 사용하세요. 아래 명령은 Git Bash·macOS·Linux 터미널 기준입니다.

### ① 작업용 저장소 2개 받기

임의의 작업 폴더에서 실행하세요.

~~~bash
GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 https://github.com/kelai141/dsh-mobile-apk.git ko-source
GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 --branch ko-patch https://github.com/min6436k/dsh-mobile-apk-Ko-KR-Patch.git ko-patches
~~~

- `ko-source`: **최신 원본을 번역**하기 위한 작업 폴더
- `ko-patches`: 생성한 **패치 파일을 커밋·업로드**할 폴더
- `GIT_LFS_SKIP_SMUDGE=1`: 번역에 필요 없는 대형 런타임 파일 다운로드를 생략

### ② 원본 파일을 번역하기

`ko-source/app/src/main/res/values-ko/strings.xml`을 새로 만들어 **UTF-8**로 저장합니다. 예:

~~~xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="ds_start_engine">엔진 시작</string>
    <string name="ds_retry">다시 시도</string>
    <string name="ds_safe_start">안전 모드로 시작</string>
</resources>
~~~

위 세 키는 실제 원본 `values/strings.xml`에 있는 키입니다. 빠진 키는 기본 `values/strings.xml`로 대체되므로 조금씩 번역해도 됩니다.

**번역할 때 주의할 점**

- `name` 키를 바꾸지 마세요. 원본 키와 정확히 일치해야 합니다.
- `%1$s`, `%2$d` 같은 Android 자리표시자의 타입·순서를 지키세요.
- 웹 UI의 `{reason}` 같은 보간 변수도 그대로 남겨야 합니다.
- XML 특수문자 `&`는 `&amp;`로 이스케이프하고 XML 문법·중복 키를 확인하세요.
- 앱의 언어 설정이 한국어일 때만 `values-ko`가 선택됩니다. 웹 UI의 언어 설정은 별도로 확인해야 합니다.

### ③ 변경한 원본에서 `.patch` 파일 만들기

원본 폴더로 이동해 수정한 파일을 Git에 등록한 뒤 diff를 생성합니다.

~~~bash
cd ko-source
git add -A app/src/main/res/values-ko/strings.xml
git diff --cached --check
git diff --cached --binary HEAD -- app/src/main/res/values-ko/strings.xml > ../ko-patches/localization/patches/001-android-ko.patch
~~~

이제 `ko-patches/localization/patches/001-android-ko.patch` 파일이 생깁니다. **`git diff --cached --binary HEAD`는 신규 파일과 기존 파일 수정 모두 처리**합니다.

웹 UI의 기존 소스 파일을 번역했다면 별도 패치로 구분할 수 있습니다. (아래는 해당 파일을 실제로 수정한 뒤 실행합니다.)

~~~bash
git add -A dsh-client-ui-responsive/src/client/mobile/upstream-browser/locales.ts
git diff --cached --binary HEAD -- dsh-client-ui-responsive/src/client/mobile/upstream-browser/locales.ts > ../ko-patches/localization/patches/020-browser-ko.patch
~~~

패치 내부에는 `diff --git a/... b/...`, `--- a/...`, `+++ b/...`와 변경 줄이 기록됩니다. **패치 파일은 직접 한 줄씩 만드는 대신 Git으로 생성하는 것을 권장**합니다. 절대 경로를 사용하지 말고, 파일을 UTF-8로 보관하세요.

패치 파일을 여러 개 만들었다면 `001-...patch`, `020-...patch`처럼 **사전순 적용 순서**를 정하세요. 뒤 패치가 앞 패치와 충돌하지 않게 기능별로 분리하는 것이 좋습니다.

### ④ 적용 가능 여부 확인하기

이미 번역이 적용된 `ko-source`에서 정방향 `git apply --check`를 하면 실패할 수 있습니다. 이때는 **역방향 검사**를 사용합니다.

~~~bash
git apply --reverse --check --binary ../ko-patches/localization/patches/001-android-ko.patch
~~~

정확한 정방향 검사는 **수정하지 않은 최신 원본의 별도 체크아웃**에서 실행하세요.

~~~bash
git apply --check --binary --whitespace=error /path/to/ko-patches/localization/patches/001-android-ko.patch
~~~

위 마지막 명령은 **깨끗한 원본 체크아웃에서 실행**해야 하며, 경로는 본인 환경에 맞게 바꿔야 합니다. GitHub Actions도 각 패치에 대해 `git apply --check` 후 순서대로 `git apply`를 실행합니다. 하나라도 충돌하면 빌드를 중단합니다.

### ⑤ 패치 브랜치에 올리기

중요: 이제 `ko-source`가 아니라 **`ko-patches` 폴더**로 이동합니다.

~~~bash
cd ../ko-patches
git status
git add localization/patches/001-android-ko.patch
git commit -m "l10n: add Korean Android strings patch"
git push origin ko-patch
~~~

푸시하면 이 포크의 **Korean arm64 Release from upstream** 워크플로가 자동 시작됩니다.

GitHub 웹으로 올리고 싶다면 **`ko-patch` 브랜치를 선택한 뒤 `localization/patches/`에 이미 만든 `.patch` 파일만** 업로드하세요. 웹에서 번역 소스 파일만 수정해 커밋하면 이 워크플로는 그 변경을 적용하지 않습니다.

## 3. 기존 한국어 패치 업데이트하기

**원본이 변경되거나 번역을 추가할 때는 최신 원본을 기준으로 패치를 다시 생성**해야 합니다.

1. `ko-source`에 아직 커밋/보관하지 않은 작업이 있다면 먼저 안전하게 보관하세요.
2. 깨끗한 작업 폴더라면 `git pull --ff-only origin main`으로 원본을 갱신하거나, 2절의 `git clone` 명령으로 새 `ko-source`를 받습니다.
3. 새 원본에서 해당 번역을 다시 수정한 후 `git add -A 파일경로` 및 `git diff --cached --binary HEAD -- 파일경로`를 실행합니다.
4. 출력 대상을 기존 `001-android-ko.patch`로 지정해 **기존 패치를 교체**하세요. 같은 영역을 수정하는 패치를 끝없이 추가하면 충돌합니다.
5. `ko-patches`에서 `git pull --ff-only origin ko-patch`로 다른 변경을 동기화한 뒤, 수정한 `.patch`만 커밋하고 `git push origin ko-patch`로 업로드합니다.
6. Actions 로그에서 적용 및 빌드 성공을 확인합니다.

이전 패치가 더는 필요 없으면 `ko-patch`에서 해당 `.patch`를 삭제해 커밋하면 됩니다. **`main`을 수정하거나 원본 소스를 이 포크에 복사할 필요는 없습니다.**

## 4. 자동 빌드, 결과와 오류 확인

1. [Actions 페이지](https://github.com/min6436k/dsh-mobile-apk-Ko-KR-Patch/actions)에서 **Korean arm64 Release from upstream** 실행 내역을 엽니다.
2. 성공하면 [Releases 페이지](https://github.com/min6436k/dsh-mobile-apk-Ko-KR-Patch/releases)의 **Draft(초안)**을 확인합니다. 초안은 일반 공개 릴리즈로 게시되기 전 상태입니다.
3. `dsh-ko-arm64.apk`를 기기에서 테스트하세요. `KO-BUILD-SOURCES.txt`에는 원본 커밋, 패치 브랜치 커밋, ABI, 서명, APK SHA-256 해시가 기록됩니다.
4. 정상 확인 후 원한다면 GitHub에서 **Publish release**로 초안을 수동 게시할 수 있습니다.

변경이 없고 최근에 동일한 원본·번역 조합으로 성공했다면 재빌드를 생략합니다. 지금 당장 재빌드하려면 **Actions → 해당 워크플로 → Run workflow → `force=true`**를 선택하세요.

원본에 새 커밋이 생기면 매일 **03:15 KST** 예약 실행에서 다시 시도합니다. 원본 변경 때문에 패치가 깨지면 **Apply Korean patch series on top of upstream** 단계에서 실패하며, 새 원본에 맞게 3절대로 패치를 재생성해야 합니다. 충돌을 자동으로 무시하지 않습니다.

## 5. 제한 사항 및 보안

- 이 저장소는 **공개**입니다. 패치나 로그에 토큰·비밀번호·개인 키·비공개 정보를 넣지 마세요.
- 현재는 **arm64 APK 하나만** 생성합니다. `x86_64` APK를 만들지 않습니다.
- 빌드는 원본 `scripts/build-apk.mjs`를 따릅니다. 원본은 `release`/`debug` 빌드 모두 저장소의 `repoDebug` 인증서를 사용하므로, GitHub **Release 초안**이라고 해서 Android 정식 배포 키로 서명됐다는 의미는 아닙니다.
- 앱의 UI/언어 전체가 자동으로 한국어가 되는 것은 아닙니다. **APK 소스에 포함된 기능만** 패치할 수 있습니다. 외부 플러그인이나 DSH 엔진의 화면을 변경하려면 별도 구현 확인이 필요합니다.
- 원본의 패키징 방식이나 빌드 검증 조건이 바뀌면 이 포크의 워크플로도 업데이트해야 할 수 있습니다.

## 6. 번역 패치 제출 시 필수 결과 보고서

다음 양식으로 **전수 조사 결과와 실제 검증 범위**를 보고하세요. 건너뛴 항목을 완료로 표시하면 안 됩니다.

~~~text
[번역 패치 작업 보고]
- 기준 업스트림 커밋:
- ko-patch 커밋 및 새/수정 .patch:
- 조사 범위(폴더/화면):
- 변경 파일 목록:
- 전용 스크립트 검사 결과: 최초 findings __건 / 최종 findings __건 / 검사 파일 __개
- 사용자 노출 문구: 번역 완료 __건 / 확인된 미완료 __건 / 구체적인 코드 근거가 있는 예외 __건
- 후보별 근거: 파일:행 / 중국어 원문 / 실제 표시·호출 경로 / 수정 패치 / 검증 결과
- 예외: auditedExceptions __건(사유 목록 첨부) / staleExceptions __건
- 검사 종료 코드: check-chinese.mjs --strict / check-chinese.test.mjs
- 화면별 검수: 시작 / 런타임 상태 / 관리 센터 / 저장소 / 플러그인 / 콘솔 / 웹 UI / 설정
- 검사 결과: git apply --check, git diff --check, 관련 테스트, APK 빌드, 기기 실행
- 미완료·기기 미검증·외부 엔진/플러그인 범위와 후속 작업:
~~~

**예시 파일만 번역했거나 APK만 빌드했다면 반드시 '부분 번역'으로 보고하세요.** 모든 번역 변경 사항은 기존 안내대로 `ko-patch/localization/patches/*.patch`에 보관하고, 깨끗한 업스트림 `main`에 적용되는지 검증합니다. 소스 파일을 포크의 `main`에 직접 덮어쓰지 마세요.
