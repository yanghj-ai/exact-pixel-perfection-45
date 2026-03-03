

## 고품질 스프라이트시트 재생성 계획

### 현실적 고려사항

AI 이미지 생성으로 **30프레임 일관된 스프라이트시트**를 한 번에 만드는 것은 기술적으로 매우 어렵습니다. AI는 프레임 간 캐릭터 일관성을 완벽히 유지하기 어렵기 때문입니다.

**추천 접근법:** **8프레임**으로 업그레이드하되, 각 프레임의 품질과 일관성을 최대화합니다. 8프레임이면 걷기/뛰기/숨쉬기 등 부드러운 애니메이션을 충분히 표현할 수 있습니다.

### 구현 내용

1. **Edge Function 생성** (`generate-spritesheet`)
   - Lovable AI (`google/gemini-2.5-flash-image`)를 사용해 각 진화 단계별 8프레임 스프라이트시트 생성
   - 프롬프트: "pixel art spritesheet, 8 frames horizontal strip, [character] walking cycle, consistent style, transparent background, 32-bit retro game style"
   - 생성된 이미지를 Supabase Storage에 저장

2. **Storage 버킷 설정**
   - `sprites` 버킷 생성 (public 읽기)
   - charmander, charmeleon, charizard 각각 저장

3. **PetSprite.tsx 업데이트**
   - `FRAME_COUNT`를 4 → 8로 변경
   - Storage URL에서 스프라이트시트 로드하도록 변경
   - 폴백으로 기존 로컬 에셋 유지

4. **수동 대안** (AI 생성 품질이 부족할 경우)
   - 기존 4프레임 이미지를 AI 편집으로 개선
   - 각 프레임을 개별 생성 후 코드로 합성

### 기술 세부사항

- Edge Function에서 3개 진화 단계 × 1개 스프라이트시트 = 3회 AI 호출
- 생성 후 base64 → Storage 업로드
- 프론트엔드는 Storage URL 사용

