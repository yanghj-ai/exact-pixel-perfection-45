import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Gen 1 Pokemon IDs grouped by type for team building
const TYPE_POKEMON: Record<string, number[]> = {
  fire: [4, 5, 6, 37, 38, 58, 59, 77, 78, 126, 136],
  water: [7, 8, 9, 54, 55, 60, 61, 62, 72, 73, 79, 80, 86, 87, 90, 91, 98, 99, 116, 117, 118, 119, 120, 121, 130, 131, 134],
  grass: [1, 2, 3, 43, 44, 45, 69, 70, 71, 102, 103, 114],
  electric: [25, 26, 81, 82, 100, 101, 125, 135, 145],
  normal: [16, 17, 18, 19, 20, 39, 40, 52, 53, 83, 84, 85, 108, 113, 115, 128, 132, 133, 137, 143],
  fighting: [56, 57, 66, 67, 68, 106, 107],
  poison: [23, 24, 29, 30, 31, 32, 33, 34, 41, 42, 88, 89, 109, 110],
  ground: [27, 28, 50, 51, 74, 75, 76, 104, 105, 111, 112],
  flying: [21, 22, 142],
  psychic: [63, 64, 65, 96, 97, 122, 124, 150, 151],
  bug: [10, 11, 12, 13, 14, 15, 46, 47, 48, 49, 123, 127],
  rock: [138, 139, 140, 141],
  ghost: [92, 93, 94],
  ice: [87, 124, 131, 144],
  dragon: [147, 148, 149],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { playerLevel, playerTeamTypes, distanceKm } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const level = Math.max(3, Math.min(50, playerLevel || 5));
    const teamTypesStr = (playerTeamTypes || []).join(", ") || "normal";
    const distance = distanceKm || 1;

    // Determine difficulty tier
    let difficultyHint = "쉬움";
    let teamSize = 1;
    if (level >= 30) { difficultyHint = "엘리트"; teamSize = Math.min(4, 2 + Math.floor(distance / 3)); }
    else if (level >= 20) { difficultyHint = "어려움"; teamSize = Math.min(3, 1 + Math.floor(distance / 3)); }
    else if (level >= 10) { difficultyHint = "보통"; teamSize = Math.min(2, 1 + Math.floor(distance / 4)); }
    else { teamSize = 1; }

    teamSize = Math.max(1, Math.min(6, teamSize));

    const systemPrompt = `당신은 포켓몬 세계의 NPC 트레이너 생성기입니다. 파이어레드/리프그린 스타일의 개성 있는 트레이너를 만들어주세요.

규칙:
- 한국어로 응답
- 트레이너는 한국식 이름 (2-3글자)
- 칭호는 게임 스타일 (꼬마, 등산가, 수영선수, 불량배, 미녀, 과학자, 낚시꾼, 무도가, 사이킥커 등)
- 대사는 짧고 개성있게 (각 15자 이내)
- emoji는 트레이너 성격에 맞는 1개
- 난이도: ${difficultyHint}
- 팀 크기: ${teamSize}마리
- 레벨 범위: ${Math.max(1, level - 5)} ~ ${level + 2}
- 상대 플레이어의 타입: ${teamTypesStr} (상성을 고려하여 도전적인 팀 구성)`;

    const userPrompt = `플레이어 레벨 ${level}, 런닝 거리 ${distance}km에 맞는 NPC 트레이너를 생성해주세요.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "create_npc_trainer",
                description: "NPC 트레이너를 생성합니다",
                parameters: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "트레이너 이름 (한국어 2-3글자)" },
                    title: { type: "string", description: "칭호 (꼬마, 등산가, 수영선수 등)" },
                    emoji: { type: "string", description: "트레이너를 나타내는 이모지 1개" },
                    personality: { type: "string", description: "성격 특성 한 단어 (열정적, 냉정한, 장난꾸러기 등)" },
                    preferredType: { type: "string", description: "선호 타입 (fire, water, grass, electric, normal, fighting, poison, ground, flying, psychic, bug, rock, ghost, ice, dragon)" },
                    dialogue_before: { type: "string", description: "배틀 전 대사 (15자 이내)" },
                    dialogue_win: { type: "string", description: "패배 시 대사 (15자 이내)" },
                    dialogue_lose: { type: "string", description: "승리 시 대사 (15자 이내)" },
                    difficulty: { type: "string", enum: ["easy", "medium", "hard", "elite"] },
                  },
                  required: ["name", "title", "emoji", "personality", "preferredType", "dialogue_before", "dialogue_win", "dialogue_lose", "difficulty"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "create_npc_trainer" } },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI gateway error");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("No tool call in response");
    }

    const npcData = JSON.parse(toolCall.function.arguments);

    // Build team from preferred type
    const prefType = npcData.preferredType || "normal";
    const typePool = TYPE_POKEMON[prefType] || TYPE_POKEMON.normal;
    
    // Filter out legendaries for non-elite
    const filteredPool = npcData.difficulty === "elite" 
      ? typePool 
      : typePool.filter(id => ![144, 145, 146, 150, 151].includes(id));
    
    // Pick random team
    const shuffled = [...filteredPool].sort(() => Math.random() - 0.5);
    const teamSpeciesIds = shuffled.slice(0, teamSize);

    // If team too small, pad with normal types
    while (teamSpeciesIds.length < teamSize) {
      const normalPool = TYPE_POKEMON.normal.filter(id => !teamSpeciesIds.includes(id));
      if (normalPool.length === 0) break;
      teamSpeciesIds.push(normalPool[Math.floor(Math.random() * normalPool.length)]);
    }

    // Determine NPC level
    const npcLevel = Math.max(3, level + Math.floor(Math.random() * 5) - 2);
    const friendship = Math.min(200, 50 + npcLevel * 3);

    const npcTrainer = {
      id: `ai_npc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: `${npcData.title} ${npcData.name}`,
      title: npcData.title,
      emoji: npcData.emoji,
      teamSpeciesIds,
      level: npcLevel,
      friendship,
      difficulty: npcData.difficulty,
      personality: npcData.personality,
      dialogue: {
        before: npcData.dialogue_before,
        win: npcData.dialogue_win,
        lose: npcData.dialogue_lose,
      },
    };

    return new Response(JSON.stringify(npcTrainer), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-npc error:", e);
    
    // Fallback: generate a simple NPC without AI
    const fallbackNames = ["민수", "지은", "철수", "소연", "준혁", "하늘", "태민", "유진"];
    const fallbackTitles = ["꼬마", "등산가", "낚시꾼", "수영선수", "런너", "불량배"];
    const fallbackEmojis = ["👦", "🧗", "🎣", "🏊‍♀️", "🏃", "😎"];
    const idx = Math.floor(Math.random() * fallbackNames.length);
    const tidx = Math.floor(Math.random() * fallbackTitles.length);
    
    const fallbackTeam = [19, 16, 21, 74, 41, 43, 56, 92];
    const shuffled = [...fallbackTeam].sort(() => Math.random() - 0.5);

    const fallback = {
      id: `fallback_npc_${Date.now()}`,
      name: `${fallbackTitles[tidx]} ${fallbackNames[idx]}`,
      title: fallbackTitles[tidx],
      emoji: fallbackEmojis[tidx],
      teamSpeciesIds: shuffled.slice(0, 2),
      level: 5,
      friendship: 50,
      difficulty: "easy",
      personality: "평범한",
      dialogue: {
        before: "승부다!",
        win: "다음엔 이긴다!",
        lose: "내가 이겼다!",
      },
    };

    return new Response(JSON.stringify(fallback), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
