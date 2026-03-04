

# 거리 기반 포켓몬 조우 + 포획 조건 퀘스트 시스템

## 현재 상태
- 전설 포켓몬은 **GPS 핫스팟 기반** (특정 좌표 근처에서만 조우)
- 일반 포켓몬은 `triggerEncounter()`로 거리 비례 확률 조우 (포획 조건 없음, 즉시 포획)
- 챌린지 시스템 존재 (streak, distance, pace, count 타입)

## 설계

### 1. 일반 포켓몬 포획 퀘스트 시스템 (`src/lib/catch-quest.ts` 신규)

조우 시 즉시 포획이 아닌, **포획 조건 퀘스트**가 부여됨:

| 포켓몬 등급 | 조우 조건 | 포획 퀘스트 예시 |
|---|---|---|
| common | 1km 달리기 | "0.5km 더 달리기" |
| uncommon | 2km 달리기 | "1km 더 달리기" or "8분/km 이내 페이스" |
| rare | 3km 달리기 | "2km 더 달리기" or "7분/km 이내 페이스" |
| epic | 5km 달리기 | "3km 더 달리기 + 7분/km 이내" |

조우 후 런닝 화면에 퀘스트 진행률 표시, 조건 달성 시 포획 확정.

### 2. 전설 포켓몬 특수 조건 (기존 `legendary.ts` 확장)

GPS 핫스팟 제거 → **거리 + 특수 조건 기반**으로 전환:

| 포켓몬 | 조우 조건 | 포획 조건 |
|---|---|---|
| 프리져 (144) | 총 누적 50km | 한 세션 3km + 15분 이상 |
| 썬더 (145) | 총 누적 100km | 한 세션 2km + 페이스 6분/km 이하 |
| 파이어 (146) | 총 누적 150km | 한 세션 5km |
| 뮤츠 (150) | **모든 챌린지 완료** | 한 세션 10km or 페이스 5분/km 이하로 5km |
| 뮤 (151) | **총 누적 1500km** | 한 세션 3km (특별 연출) |

### 3. 특수 이벤트 조우 추가

- **이브이 (133)**: 연속 출석 7일 → 조우
- **라프라스 (131)**: 주간 목표 3주 연속 달성 → 조우
- **잠만보 (143)**: 총 세션 50회 달성 → 조우
- **메타몽 (132)**: 도감 50종 이상 등록 → 조우

### 4. 수정 파일 목록

| 파일 | 변경 내용 |
|---|---|
| `src/lib/catch-quest.ts` | **신규** — 포획 퀘스트 타입, 생성, 진행률 체크, 완료 로직 |
| `src/lib/legendary.ts` | GPS 핫스팟 → 거리/챌린지 기반 조건으로 전환, 특수 이벤트 목록 추가 |
| `src/lib/collection.ts` | `triggerEncounter()` → 즉시 포획 대신 퀘스트 반환, 이벤트 조우 체크 함수 추가 |
| `src/pages/Running.tsx` | 조우 시 포획 퀘스트 배너 UI, 진행률 표시, 포획 성공 연출 |
| `src/pages/Pokedex.tsx` | 전설/이벤트 포켓몬 조우 조건 힌트 표시 |
| `src/components/CatchQuestBanner.tsx` | **신규** — 런닝 중 포획 퀘스트 진행률 배너 컴포넌트 |
| `src/components/SpecialEncounterOverlay.tsx` | **신규** — 특수 조우/포획 성공 연출 오버레이 |

### 5. 데이터 구조

```text
CatchQuest {
  id: string
  speciesId: number
  encounterDistanceKm: number   // 조우 시점 거리
  questType: 'distance' | 'pace' | 'time' | 'combo'
  requirements: { type, target, unit }[]
  startedAt: number
  completed: boolean
}

SpecialEvent {
  id: string
  speciesId: number
  condition: 'total_distance' | 'all_challenges' | 'streak' | 'weekly_goal_streak' | 'session_count' | 'pokedex_count'
  targetValue: number
  description: string
  hint: string
}
```

### 6. 흐름

1. 런닝 중 거리 도달 → `checkEncounter(distanceKm)` → 포켓몬 조우
2. 조우 시 등급에 맞는 `CatchQuest` 자동 생성
3. 런닝 화면에 퀘스트 배너 표시 (진행률 바)
4. 퀘스트 조건 달성 → 포획 연출 + 컬렉션 등록
5. 런닝 종료 시 미완료 퀘스트는 실패 처리
6. 전설/이벤트는 홈 또는 도감에서 조건 확인 가능, 조건 달성 시 런닝 시작 시 자동 조우

