

# 러닝 완료 시 챌린지 업데이트 + 코인 보상 연동

## 현재 상태
`Running.tsx`의 `handleStop()`에서 스트릭, EXP, 코인, 컨디션, 유대감, 포켓몬 조우 등은 처리하지만 **챌린지 시스템(`updateChallengesAfterRun`)은 호출하지 않음**.

## 변경 사항

### 1. `src/pages/Running.tsx` — `handleStop()` 로직 추가
- `updateChallengesAfterRun`를 import하고 `handleStop()` 내에서 호출
- 파라미터: `distanceKm`, `paceMinPerKm`, `regionId`, `hour` (현재 시각)
- 반환값의 `totalCoinsEarned`를 `addCoins()`로 지급
- `newlyCompleted` 챌린지마다 toast 알림 표시
- `newTitles`에 대한 toast 표시

### 2. `src/pages/Running.tsx` — completedData 타입 확장
- `completedData`에 `challengeResults` 필드 추가 (`ChallengeUpdateResult` 타입)

### 3. `src/pages/Running.tsx` — 완료 화면 UI 추가
- 파티 EXP 섹션 아래에 "챌린지 달성" 카드 추가
- 완료된 챌린지 목록 (emoji + name + rewardCoins + rewardTitle)
- framer-motion 애니메이션으로 순차 표시

### 기술 세부사항

`handleStop()` 내 추가 코드 위치: `saveRunRecord()` 직전 (line ~397)

```text
// 챌린지 업데이트
const challengeResults = updateChallengesAfterRun({
  distanceKm: distKm,
  paceMinPerKm: pace ?? 0,
  regionId: region?.id,
  hour: new Date().getHours(),
});

// 챌린지 보상 코인 지급
if (challengeResults.totalCoinsEarned > 0) {
  addCoins(challengeResults.totalCoinsEarned);
}

// 완료 알림
for (const ch of challengeResults.newlyCompleted) {
  toast(`🏅 챌린지 달성: ${ch.emoji} ${ch.name}!`, {
    description: `코인 +${ch.rewardCoins}${ch.rewardTitle ? ` | 칭호: ${ch.rewardTitle}` : ''}`,
    duration: 5000,
  });
}
```

완료 화면 UI는 스트릭 마일스톤 섹션 바로 아래에 배치.

