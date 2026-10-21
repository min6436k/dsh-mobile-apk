# DeepCode Android — 한국어 패치

원본 [dsh-mobile-apk](https://github.com/kelai141/dsh-mobile-apk)의 **최신 `main`** 소스에 한국어 패치와 Android 전용 개선 사항을 순서대로 적용해 **ARM64 APK**를 만드는 경량 패치 포크입니다.

**이 저장소의 소스 파일을 그대로 빌드하지 않습니다.** GitHub Actions가 매번 원본 소스를 체크아웃한 뒤 `ko-patch`의 `localization/patches/*.patch`만 순서대로 적용합니다. 포크의 `main`은 원본 추적용이며 변경하지 않습니다.

## 바로가기

- [한국어화·패치 작업 가이드](localization/README.md) — **유일한 유지보수 기준 문서**
- [패치 목록](localization/patches/) — 배포 코드 변경의 유일한 출처
- [미번역 중국어 검사기](localization/scripts/check-chinese.mjs) · [회귀 테스트](localization/scripts/check-chinese.test.mjs)
- [ARM64 Actions](https://github.com/min6436k/dsh-mobile-apk-Ko-KR-Patch/actions/workflows/ko-upstream-apk.yml)
- [GitHub Releases](https://github.com/min6436k/dsh-mobile-apk-Ko-KR-Patch/releases)

## 빌드와 다운로드

패치를 수정해 `ko-patch`에 푸시하면 자동 빌드합니다. 수동으로 빌드하려면 Actions에서 **Korean arm64 Release from upstream → Run workflow**를 선택하세요. 원본 변경 확인은 매일 03:15 KST에도 실행됩니다.

성공 시 GitHub **Draft Release(초안)**에 세 파일을 올립니다.

| 파일 | 용도 |
| --- | --- |
| `dsh-ko-arm64.apk` | ARM64 APK |
| `dsh-ko-arm64.apk.sha256` | APK 무결성 확인 |
| `KO-BUILD-SOURCES.txt` | 업스트림/패치 커밋, 서명자, APK 해시 |

Draft는 공개 릴리스가 아닙니다. 실제 기기 동작을 확인하고 필요할 때만 직접 게시하세요. **빌드·검사 성공은 실제 기기의 모든 한국어 표시가 검증되었다는 뜻이 아닙니다.**

## 작업 원칙

1. 한국어 번역과 기능 수정은 `localization/patches/*.patch`에만 기록합니다. 업스트림 소스를 복사해 커밋하지 않습니다.
2. 주석·정상 번역 원문을 제외한 미번역 후보뿐 아니라, 화면에도 나타날 수 있는 **내부 식별자**를 검출하고 표시 번역·기존 저장 데이터 호환성을 검증합니다.
3. 최신 원본에 패치를 **새로 적용한 결과**로 검사합니다. 오래된 작업본이 통과한 결과를 재사용하지 않습니다.
4. Android 기기 설치 테스트는 별개입니다. 아직 실행하지 않았다면 미검증으로 기록합니다.

**Oracle 단일 작업 경로:** `/home/ubuntu/project/dsh-mobile-apk-Ko-KR-Patch`
원본 작업본·복구 차분은 Git 제외 경로인 `.workspace/`에만 두세요. 자세한 명령은 [작업 가이드](localization/README.md)를 참고하세요.

원본의 별도 빌드·개발 문서 및 `scripts/`는 업스트림 소스의 참고 자료입니다. 이 한국어 포크의 배포 지침은 아닙니다. 외부 DSH 엔진 전체와 제삼자 플러그인의 동작까지 보증하지 않습니다.
