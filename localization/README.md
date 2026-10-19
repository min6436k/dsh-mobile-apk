# Ko-KR-Patch: 한국어 패치 제작 가이드

이 공개 포크는 [원본 dsh-mobile-apk](https://github.com/kelai141/dsh-mobile-apk)의 최신 `main`을 자동으로 받아, 별도 브랜치에서 관리하는 한국어 `.patch` 파일을 적용한 후 **arm64 APK 하나**를 빌드합니다.

- 자동 빌드 설정: 이 저장소의 기본 브랜치 `ko-patch` → `.github/workflows/ko-upstream-apk.yml`
- 한국어 패치 보관: 이 저장소의 **`ko-patch` 브랜치** → `localization/patches/*.patch`
- 빌드 대상: 원본 `kelai141/dsh-mobile-apk`의 최신 `main`
- 원본 추적 브랜치: 이 포크의 `main`은 업스트림 `main`과 동일한 소스만 보관하고, 번역 및 자동화는 `ko-patch`에서 관리합니다.
- 결과물: [Releases](https://github.com/min6436k/dsh-mobile-apk-Ko-KR-Patch/releases)의 **Draft(초안)** 안에 `dsh-ko-arm64.apk`, `KO-BUILD-SOURCES.txt`
- 실행: 패치 추가·변경 시 자동 / 매일 03:15(KST) 원본 변경 확인 / Actions 수동 실행

> **가장 중요한 원칙:** `ko-patch`에는 번역을 완료한 소스 파일 자체가 아니라 **소스의 변경 사항을 기록한 `.patch` 파일**을 올립니다. 자동 빌드는 원본의 깨끗한 최신 소스에 패치를 덧씌웁니다. `main` 브랜치에 한국어 파일을 직접 수정해 넣지 마세요.

## 1. 어디를 번역하나요?

| 번역 대상 | 원본에 존재하는 파일 | 권장 방법 |
| --- | --- | --- |
| Android 앱 시작 화면·버튼·오류 문구 | `app/src/main/res/values/strings.xml` | `app/src/main/res/values-ko/strings.xml`을 새로 만들어 한국어 키 추가 |
| 앱 내 웹 UI의 브라우저 | `dsh-client-ui-responsive/src/client/mobile/upstream-browser/locales.ts` | 언어별 사전 및 언어 선택 코드 확인 후 수정 |
| 앱 내 웹 UI의 사이드바 | `dsh-client-ui-responsive/src/client/mobile/sidebar-bubbles.locales.ts` | 언어별 사전 및 언어 선택 코드 확인 후 수정 |
| 그 밖의 앱 코드 텍스트 | 해당 원본 소스 | 원본 저장소의 실제 소스만 수정 |

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
