## 한국어 패치 PR

- **변경 목적:**
- **기준 업스트림 `main` SHA:**
- **수정/추가한 `localization/patches/*.patch`:**
- **실제 화면·플러그인 영향:**

### 검증 체크리스트

- [ ] `ko-patch` 대상으로 PR을 열었고, 원본 추적용 `main`은 수정하지 않았습니다.
- [ ] Git에 변경된 업스트림 소스 전체가 아닌 **경량 `.patch` 차분**을 추가했습니다.
- [ ] 깨끗한 최신 업스트림에 **전체 패치 체인**을 이름순으로 재적용해 통과했습니다.
- [ ] `git diff --check` 및 `node --test localization/scripts/check-chinese.test.mjs`를 통과했습니다.
- [ ] 실제 패치 적용된 원본을 대상으로 `node localization/scripts/check-chinese.mjs <source> --strict`를 통과했습니다.
- [ ] 내부 식별자 중국어도 검출·분류하고 표시 번역 및 기존 데이터 호환성을 점검했습니다.
- [ ] 관련 Kotlin·Web UI·내장 플러그인 회귀 테스트를 실행했습니다. 실행하지 못한 항목은 이유를 적었습니다.
- [ ] API 키·토큰·개인정보 및 `.workspace/` 차분/로그를 커밋하지 않았습니다.
- [ ] 이전 APK/Draft Release를 새 빌드 검증 이전에 삭제하지 않았습니다.

**검증 결과 / 미검증 사항:**

> APK Actions 성공 ≠ 실제 기기 검증 완료. 관련 화면을 실기기에서 확인하지 못했다면 반드시 미검증이라고 명시하세요.
