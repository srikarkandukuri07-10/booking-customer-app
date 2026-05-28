import { NextResponse } from "next/server";

// Dynamic resolution of backend URL from environment variables, defaulting to localhost:3000
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Support both server-side environment variables and client-exposed keys under multiple names
const GEMINI_API_KEY = 
  process.env.GEMINI_API_KEY || 
  process.env.NEXT_PUBLIC_GEMINI_API_KEY || 
  process.env.GOOGLE_API_KEY || 
  process.env.NEXT_PUBLIC_GOOGLE_API_KEY || 
  process.env.GEMINI_KEY ||
  process.env.NEXT_PUBLIC_GEMINI_KEY;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderedItems } = body;

    if (!orderedItems || !Array.isArray(orderedItems) || orderedItems.length === 0) {
      return NextResponse.json({ success: false, message: "No ordered items provided." }, { status: 400 });
    }

    // 1. Fetch the complete live menu catalog from the backend to ensure suggestions exist in stock
    let allItems: any[] = [];
    try {
      const menuRes = await fetch(`${BACKEND_URL}/api/menu?public=true`);
      const menuData = await menuRes.json();
      if (menuData.success && menuData.categories) {
        menuData.categories.forEach((cat: any) => {
          cat.items.forEach((item: any) => {
            allItems.push({
              id: item.id,
              name: item.name,
              category: cat.name,
              price: item.price,
              veg: item.veg,
              description: item.description
            });
          });
        });
      }
    } catch (menuErr) {
      console.warn("⚠️ Suggestions API failed to fetch live menu catalog, falling back...", menuErr);
    }

    // If live catalog is empty, we cannot suggest anything safely
    if (allItems.length === 0) {
      return NextResponse.json({ success: true, suggestions: [] });
    }

    // 2. If Gemini API Key is available, invoke Google's Generative AI to get real-time culinary suggestions
    if (GEMINI_API_KEY && GEMINI_API_KEY !== "YOUR_API_KEY_HERE") {
      try {
        const promptText = `
You are the world-class Executive Chef at "L'Ambre Rustic" fine dining restaurant.
A customer has just placed an order containing these dishes:
${JSON.stringify(orderedItems.map(i => ({ name: i.item.name, category: i.item.category })))}

Here is our complete active menu catalog available today:
${JSON.stringify(allItems.map(item => ({ id: item.id, name: item.name, category: item.category, price: item.price, veg: item.veg })))}

Select 2 or 3 highly complementary dishes or drinks from the catalog that would go perfectly with their order.
Provide a highly personalized, mouth-watering reason for each suggestion that references exactly what they ordered (e.g. pairing a spicy starter with a cool mango lassi or a heavy biryani with a warm gulab jamun dessert). Do not suggest items they have already ordered.

You must return a JSON object matching this schema:
{
  "suggestions": [
    {
      "itemId": "string (the exact ID of the item from the catalog)",
      "reason": "string (the chef's personalized pairing reason)"
    }
  ]
}
Return ONLY the raw JSON string matching this schema. No markdown formatting, no backticks, and no extra text.
`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        const aiResponse = await fetch(geminiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: promptText
                  }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const responseText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (responseText) {
            let cleanedText = responseText.trim();
            
            // Resiliently strip any Markdown code blocks that Gemini might wrap around the JSON response
            if (cleanedText.startsWith("```")) {
              cleanedText = cleanedText.replace(/^```[a-zA-Z]*\n?/, "");
              cleanedText = cleanedText.replace(/```$/, "");
              cleanedText = cleanedText.trim();
            }
            
            const parsedSuggestions = JSON.parse(cleanedText);
            if (parsedSuggestions && Array.isArray(parsedSuggestions.suggestions)) {
              console.log("🤖 Real Gemini Suggestions generated successfully!");
              return NextResponse.json({
                success: true,
                suggestions: parsedSuggestions.suggestions,
                source: "Gemini AI"
              });
            }
          }
        } else {
          console.warn("⚠️ Gemini API returned error status:", aiResponse.status);
        }
      } catch (aiErr) {
        console.warn("⚠️ Gemini AI content generation failed, falling back to smart local heuristic...", aiErr);
      }
    }

    // 3. Fallback Heuristic Suggestions: Category-aware, mouth-watering recommendations
    console.log("🍳 Generating local smart Chef heuristics for recommendations...");
    const localSuggestions = getLocalSuggestions(orderedItems, allItems);
    return NextResponse.json({
      success: true,
      suggestions: localSuggestions,
      source: "Chef's Recommendations Heuristic"
    });

  } catch (error: any) {
    console.error("Suggestions API Route error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Internal server error." }, { status: 500 });
  }
}

// Category-aware smart fallback pairing engine
function getLocalSuggestions(orderedItems: any[], allItems: any[]) {
  const suggestions: any[] = [];
  const orderedIds = new Set(orderedItems.map(i => i.item.id));
  const orderedCategories = new Set(orderedItems.map(i => i.item.category));

  // Candidates that are not already ordered
  const candidates = allItems.filter(item => !orderedIds.has(item.id));
  if (candidates.length === 0) return [];

  const hasMain = orderedCategories.has("Main Course") || orderedCategories.has("Biryani");
  const hasDessert = orderedCategories.has("Desserts");
  const hasDrink = orderedCategories.has("Drinks");
  const hasStarter = orderedCategories.has("Starters");

  // A. Suggest a Dessert for savory main orders
  if (hasMain && !hasDessert) {
    const desserts = candidates.filter(c => c.category === "Desserts");
    if (desserts.length > 0) {
      const d = desserts[Math.floor(Math.random() * desserts.length)];
      suggestions.push({
        itemId: d.id,
        reason: `To balance your savory main course, our pastry chef highly recommends the decadent ${d.name}. A warm, sweet treat is the perfect way to round off your rustic dining session!`
      });
    }
  }

  // B. Suggest a refreshing signature Drink if none ordered
  if (!hasDrink) {
    const drinks = candidates.filter(c => c.category === "Drinks");
    if (drinks.length > 0) {
      const dr = drinks[Math.floor(Math.random() * drinks.length)];
      suggestions.push({
        itemId: dr.id,
        reason: `No meal is complete without a refreshing beverage! Pair your dishes with our popular ${dr.name} to refresh your palate between bites.`
      });
    }
  }

  // C. Suggest a Main Course if they only ordered Starters
  if (hasStarter && !hasMain) {
    const mains = candidates.filter(c => c.category === "Main Course" || c.category === "Biryani");
    if (mains.length > 0) {
      const m = mains[Math.floor(Math.random() * mains.length)];
      suggestions.push({
        itemId: m.id,
        reason: `Loved our starters? Continue your culinary journey with our executive chef's signature ${m.name}. It features aromatic spices that build beautifully on the starters!`
      });
    }
  }

  // D. Random complementary fillers to ensure at least 2 beautiful suggestions
  while (suggestions.length < 2 && candidates.length > suggestions.length) {
    const remaining = candidates.filter(c => !suggestions.some(s => s.itemId === c.id));
    if (remaining.length === 0) break;
    const r = remaining[Math.floor(Math.random() * remaining.length)];
    suggestions.push({
      itemId: r.id,
      reason: `Our kitchen highly recommends adding a serving of ${r.name}. It's a crowd-favorite pairing that complements a wide array of flavors!`
    });
  }

  return suggestions.slice(0, 3);
}
