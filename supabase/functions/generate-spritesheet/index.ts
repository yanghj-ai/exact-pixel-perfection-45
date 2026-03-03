import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROMPTS: Record<string, string> = {
  charmander:
    "Create a pixel art spritesheet of Charmander (the fire Pokemon) as a horizontal strip with exactly 8 frames showing a smooth walking cycle animation. Each frame should be a 128x128 pixel square. The character must look identical in every frame - same proportions, same colors (orange body, cream belly, flame tail). Only the legs and tail flame should animate between frames. Use a clean transparent background. 32-bit retro game style, crisp pixel edges, no anti-aliasing blur. The 8 frames should tile seamlessly left to right in a single row.",
  charmeleon:
    "Create a pixel art spritesheet of Charmeleon (the fire Pokemon, evolved form) as a horizontal strip with exactly 8 frames showing a smooth walking cycle animation. Each frame should be a 128x128 pixel square. The character must look identical in every frame - same proportions, same dark red/crimson body, cream belly, flame tail. Only the legs and tail flame should animate between frames. Use a clean transparent background. 32-bit retro game style, crisp pixel edges, no anti-aliasing blur. The 8 frames should tile seamlessly left to right in a single row.",
  charizard:
    "Create a pixel art spritesheet of Charizard (the fire Pokemon, final evolution) as a horizontal strip with exactly 8 frames showing a smooth walking/wing-flapping cycle animation. Each frame should be a 128x128 pixel square. The character must look identical in every frame - same proportions, same orange body, cream belly, blue-green wings, flame tail. Only the wings and tail flame should animate between frames. Use a clean transparent background. 32-bit retro game style, crisp pixel edges, no anti-aliasing blur. The 8 frames should tile seamlessly left to right in a single row.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { stage } = await req.json();

    if (!stage || !PROMPTS[stage]) {
      return new Response(
        JSON.stringify({ error: "Invalid stage. Use: charmander, charmeleon, charizard" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Generating spritesheet for ${stage}...`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: PROMPTS[stage] }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: `AI generation failed: ${aiResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error("No image in AI response:", JSON.stringify(aiData).slice(0, 500));
      return new Response(
        JSON.stringify({ error: "AI did not return an image" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract base64 data
    const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    // Upload to Supabase Storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const filePath = `${stage}-spritesheet.png`;

    const { error: uploadError } = await supabase.storage
      .from("sprites")
      .upload(filePath, binaryData, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: `Upload failed: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: urlData } = supabase.storage
      .from("sprites")
      .getPublicUrl(filePath);

    console.log(`Successfully generated and uploaded ${stage} spritesheet: ${urlData.publicUrl}`);

    return new Response(
      JSON.stringify({ success: true, stage, url: urlData.publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
