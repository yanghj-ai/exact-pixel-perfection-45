

# ROUTINMON v7 UX/시스템 개선 구현 계획

6개의 FIX를 순서대로 구현합니다.

---

## FIX #1: 스킬 레벨 시스템

**새 파일**: `src/lib/skill-system.ts`

- `PokemonSkillState` 인터페이스: 스킬별 사용 횟수(`usageCount`)와 스킬 레벨(`skillLevel`, 1~5) 저장
- `SKILL_LEVEL_TABLE`: 레벨별 위력/명중 보너스 (Lv2: +5/+3, Lv3: +12/+5, Lv4: +20/+8, Lv5: +30/+10)
- `SKILL_UNLOCK_LEVELS`: 포켓몬 레벨 → 스킬 슬롯 해금 (Lv1→1개, Lv5→2개, Lv12→3개, Lv20→4개)
- `getUnlockedMoves(speciesId, level)`: 레벨에 따라 해금된 스킬만 반환
- `onSkillUsed(pokemonUid, moveKey)`: 사용 횟수 증가 + 레벨업 체크
- `getEffectiveMove(move, skillState)`: 스킬 레벨 보너스 적용된 위력/명중 반환
- localStorage `routinmon-skill-states`에 저장, 클라우드 동기화

**수정 파일**:
- `src/lib/battle.ts`: `executeTurn`에서 `onSkillUsed` 호출, `doAttack`에서 `getEffectiveMove` 적용
- `src/lib/battle-moves.ts`: `getMovesForPokemon` → `getUnlockedMoves` 연동 (레벨 기반 해금)
- `src/pages/Battle.tsx`: 스킬 레벨 배지 표시, 레벨업 토스트
- `src/pages/Party.tsx`: 상세 모달에 스킬 목록 + 레벨/사용량 표시

---

## FIX #2: 도감/진화 분리 시스템

기존 `collection.ts`의 `seen` 배열이 이미 "발견" 역할을 하고 있으므로, 이를 확장합니다.

**수정 파일**: `src/lib/collection.ts`
- `CollectionState.seen` → `pokedex: Record<number, PokedexEntry>` 확장 (최초 발견일, 발견 장소, 상태)
- `PokedexEntry`: `{ status: 'undiscovered' | 'discovered' | 'owned', firstDiscoveredAt?, firstDiscoveredLocation? }`
- 진화 시: 진화 전 종은 `discovered`로 전환 (기록 유지), 진화 후 종은 `owned`로 등록
- `grantExpToParty` 진화 로직에서 스킬 계승 처리 추가 (FIX #1 연동)
- 하위 호환: 기존 `seen[]` 데이터를 `pokedex`로 마이그레이션

**수정 파일**: `src/pages/Pokedex.tsx`
- 3단계 표시: 실루엣(미발견) / 컬러(발견) / 금테(현재 보유)
- 도감 상세 카드에 최초 발견일, 보유 상태 배지 추가
- 탭 필터: 전체 / 보유중 / 발견 / 미발견

---

## FIX #3: 러닝 화면 UX 간소화

**수정 파일**: `src/pages/Running.tsx`
- 목표 선택 UI 전체 제거 (`selectedGoal`, `GOAL_CONFIG`, 6개 버튼)
- `handleStop`에서 자동 배율 계산: 거리 기반 (1km→x1.1, 3km→x1.3, 5km→x1.5, 10km→x2.0) + 연속 3일 보너스
- Idle 화면: 동반 포켓몬 카드 + 대사 말풍선 + 큰 재생 버튼 + 보상 미니카드 (FIX #4) + 최근 기록

**새 파일**: `src/lib/auto-multiplier.ts`
- `calculateAutoMultiplier(distanceKm, streakDays)`: `{ exp: number, coin: number }` 반환

---

## FIX #4: 보상 UI 반응형 전환

**새 파일**: `src/components/running/RewardMiniCards.tsx`
- 러닝 시작 전: 횡스크롤 미니카드 (EXP, 코인, 컨디션, 친밀도, 배율)
- 아이콘 + 라벨 + 값 형식의 둥근 카드 UI

**수정 파일**: `src/components/running/RunningAmoledScreen.tsx`
- 러닝 중: 상단에 실시간 누적 보상 (EXP/코인 아이콘 + 카운트업)
- 배율 달성 시 토스트 ("3km 달성! 배율 x1.3 적용")

**수정 파일**: `src/pages/Running.tsx` (완료 화면)
- 결과 보상 카드 순차 애니메이션 (거리→EXP→코인→포켓몬→컨디션→다음 배율 안내)

---

## FIX #5: 동반 포켓몬 대사 시스템

**새 파일**: `src/lib/companion-dialogue.ts`
- `DialogueTrigger` 배열: 우선순위별 (이벤트 > 조우 > 러닝 > 컨디션 > 복귀 > 기본)
- 시간대 인사 (아침/점심/저녁/밤), 컨디션 반응, 친밀도 구간별 대사
- 복귀 대사: `lastLoginDate` 기반 (1일/3일/7일+)
- `getCompanionDialogue(context)`: 최우선 트리거의 랜덤 대사 반환

**수정 파일**:
- `src/pages/Home.tsx`: 홈 화면 동반 포켓몬 말풍선에 `getCompanionDialogue` 연결
- `src/pages/Running.tsx`: idle 화면 말풍선, 러닝 중 `cheerMessage`를 대사 시스템으로 교체

---

## FIX #6: 파티 관리 기능 강화

**수정 파일**: `src/pages/Party.tsx` — 대폭 리뉴얼
- Dialog → Drawer(바텀시트)로 변경
- 3탭 구조: **상태** (스프라이트, 스탯 바, EXP 바, 컨디션, 친밀도, 스킬 리스트) / **아이템** (회복/EXP/진화 아이템 카드) / **관리** (리더 설정, 순서 변경, 박스 이동, 방생, 닉네임)
- 길게 누르기 → 드래그 정렬 모드 (파티 슬롯 상하 드래그, 시각 피드백)
- 방생 기능: 2단계 확인 → 보유에서 제거 + 도감 기록 유지 (FIX #2 연동)
- 스킬 카드 탭 → 스킬 상세 바텀시트 (FIX #1 연동)

**새 컴포넌트**: `src/components/party/PartyStatusTab.tsx`, `PartyItemTab.tsx`, `PartyManageTab.tsx`
- 각 탭의 UI를 분리하여 Party.tsx 경량화

---

## 구현 순서 및 의존성

```text
FIX #1 (스킬 레벨) ──┐
                     ├─→ FIX #6 (파티 관리: 스킬 표시)
FIX #2 (도감 분리)  ──┤
                     ├─→ FIX #6 (파티 관리: 방생)
FIX #3 (러닝 간소화) ─┤
                     ├─→ FIX #4 (보상 UI)
FIX #5 (대사 시스템) ─┘
```

1→2→3→4→5→6 순서로 진행. 각 FIX 완료 후 다음으로 넘어갑니다.

