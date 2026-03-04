

# FIX #6: 전설 포켓몬 5종 스토리 미션 시스템

## 요약

기존 `legendary.ts`의 단순 거리 기반 조우 조건을 **챌린지 완료 기반 스토리 해금** 시스템으로 전환합니다. 각 전설 포켓몬은 특정 챌린지 조합을 완료해야 해금되며, 해금 후 런닝 시작 시 스토리 연출과 함께 포획 미션이 발동됩니다.

## 문서 스펙 (FIX #6)

| 포켓몬 | 해금 조건 | 포획 미션 |
|---|---|---|
| 프리져 (144) | SP1(얼리버드) + S2(7일연속) 완료 | 새벽 5km 완주 |
| 썬더 (145) | SP3(스피드스터) + D3(5km러너) 완료 | 3km, 페이스 4:30/km 이하 |
| 파이어 (146) | S4(30일연속) + D4(10km정복) 완료 | 10km 완주 |
| 뮤 (151) | 전 챌린지 100% 달성 | 배틀 없이 합류 (자동 포획) |
| 뮤츠 (150) | 뮤 보유 + T4(500km) 완료 + 유전자 촉매 사용 | 10km 특별 런닝 |

## 변경 사항

### 1. `src/lib/legendary.ts` 수정
- **LEGENDARY_DEFS** 업데이트: 각 포켓몬의 `encounterCondition`과 `mission` requirements를 문서 스펙대로 변경
  - 프리져: 5km distance mission (기존 3km+15분 → 5km)
  - 썬더: 3km + pace 4:30 (기존 2km + pace 6:00 → 3km + pace 4:30)
  - 파이어: 10km distance (기존 5km → 10km)
  - 뮤: 자동 포획이므로 mission을 최소 조건(0.1km)으로 설정
  - 뮤츠: 10km distance (기존과 유사하지만 조건 단순화)
- **`checkLegendaryEncounterConditions()`** 수정: 거리 기반 → 챌린지 완료 여부 체크로 전환
  - `getChallengeState()`를 import하여 특정 챌린지 ID 완료 여부 확인
  - 뮤: 모든 챌린지(26개) 100% 완료 체크
  - 뮤츠: 뮤 보유 + T4 완료 + 유전자 촉매(인벤토리) 사용 체크
- **스토리 텍스트** 추가: 각 LegendaryDefinition에 `storyIntro` (조우 시 연출 메시지), `storyOutro` (포획 시 메시지) 필드 추가
- **SPECIAL_EVENTS 제거**: 이브이/라프라스/잠만보/메타몽은 더 이상 special event가 아닌 일반 등급 시스템(spawn-data.ts)에서 처리되므로 제거

### 2. `src/lib/challenge.ts` 수정
- `isChallengeCompleted(id: string): boolean` 헬퍼 함수 export 추가
- `areAllChallengesCompleted(): boolean` 헬퍼 함수 export 추가

### 3. `src/components/running/LegendaryPreview.tsx` 수정
- 스토리 힌트와 해금 조건 표시 개선 (어떤 챌린지가 필요한지 표시)
- SPECIAL_EVENTS 제거에 따른 이벤트 섹션 제거

### 4. `src/pages/Running.tsx` 수정
- 전설 조우 시 스토리 메시지(storyIntro) 표시
- 뮤 조우 시 자동 포획 처리 (미션 스킵)
- 포획 성공 시 스토리 메시지(storyOutro) 표시
- `checkSpecialEventConditions` 호출 제거

### 5. `src/components/running/RunningBanners.tsx` 수정
- LegendaryBanner에 스토리 메시지 표시 영역 추가

### 6. `src/pages/Pokedex.tsx` 수정
- 전설 포켓몬 상세에서 스토리 힌트와 해금에 필요한 챌린지 목록 표시

