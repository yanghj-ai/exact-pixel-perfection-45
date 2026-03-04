

# FIX #7: 동반 포켓몬 EXP 1.5배 보너스 시스템

## 개요

파티 리더(동반 포켓몬)가 런닝 시 EXP를 1.5배 받도록 구현합니다. 현재 `grantExpToParty()`는 모든 파티원에게 균등 분배하지만, 리더에게만 추가 보너스를 적용합니다.

## 변경 사항

### 1. `src/lib/collection.ts` — `grantExpToParty()` 수정
- 새 선택적 파라미터 `leaderBonusMultiplier = 1.5` 추가
- 파티 첫 번째 멤버(리더)에게 `expPerMember * 1.5`를 적용
- `PartyExpResult`에 `isLeader: boolean` 필드 추가 (UI 표시용)

### 2. `src/pages/Running.tsx` — 완료 화면에 보너스 표시
- `grantExpToParty` 호출은 기존대로 유지 (리더 보너스는 내부에서 자동 적용)
- 완료 화면의 파티 EXP 목록에서 리더에 "동반 보너스 x1.5" 뱃지 표시

### 3. `src/components/running/RunningCompleted.tsx` — 리더 보너스 UI
- `PartyExpResult`의 `isLeader` 체크하여 리더 행에 "🤝 x1.5" 뱃지 추가

### 4. `src/components/home/PetCard.tsx` — 홈 화면에 동반 보너스 힌트
- 기존 친밀도 표시 근처에 "동반 EXP x1.5" 작은 뱃지 추가

## 기술 세부사항

```text
grantExpToParty(totalExp) 변경 로직:
  expPerMember = totalExp / partySize
  for each member:
    if member == party[0] (leader):
      actualExp = floor(expPerMember * 1.5)
      isLeader = true
    else:
      actualExp = expPerMember
      isLeader = false
```

Battle.tsx의 `grantExpToParty` 호출도 동일하게 리더 보너스가 자동 적용됩니다.

