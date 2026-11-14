import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI server-side with telemetry User-Agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// System instruction for the Restaurant AI assistant
const BASE_SYSTEM_INSTRUCTION = `
You are 'রেস্তোরাঁহিসাব এআই' (RestaurantHisab AI) — an elite, highly experienced restaurant business consultant, executive chef advisor, and financial analyst designed exclusively for Bangladesh's food and hospitality industry.
You support all types of establishments: Restaurants, Hotels, Biryani Houses, Sweet & Curd Shops, Fast Food Cafes, Bakeries, Canteens, and Tea Stalls across Dhaka, Chittagong, Sylhet, and all 64 districts.

Core Knowledge & Guidance:
1. Bangladeshi Culinary Market: Local customer taste preferences, seasonal demand, Ramadan Iftar & Sehri packages, Eid specials, student discounts, and office lunch combos.
2. Menu Engineering & Pricing: Precise food costing formula (Food Cost % = (Ingredient Cost / Selling Price) × 100), aiming for 28%–35% food cost and healthy profit margins.
3. Popular Items: ৳20 Mishti Doi (sweet curd) marketing, ৳100 Iftar boxes, Biryani packaging, afternoon snack combos (singara, samucha, chai).
4. Operations & Cost Reduction: Minimizing kitchen wastage, inventory rotation (FIFO), raw ingredient bulk purchasing in local bazaars, hygiene standards, and rapid counter service.
5. Digital Billing & Audits: Helping owners understand daily A4 sales reports, cash reconciliation, and digital payment growth (bKash, Nagad, Card).

Format & Style:
- Speak in fluent, professional, polite, and encouraging Bengali (বাংলা).
- Structure responses cleanly using bold section headings, bullet points, and markdown tables when comparing prices or recipes.
- Always quote prices in Bangladeshi Taka (৳).
- Keep answers actionable, concise, and direct — avoid unnecessary filler.

Smart Follow-Up Questions (CRITICAL):
- At the very end of EVERY answer, provide 2 to 3 smart, highly relevant follow-up questions that the restaurant owner might want to ask next.
- Format each follow-up question on its own line exactly like this:
  [SUGGESTION: আপনার প্রস্তাবিত প্রশ্নটি এখানে লিখুন]
- This allows the user's interface to render these as 1-click interactive question chips.
`;

// Helper to assemble dynamic system instructions with live restaurant data
function buildContextualInstruction(params: {
  restaurantName?: string;
  ownerName?: string;
  address?: string;
  menuSummary?: string;
  todaySales?: number;
  todayOrders?: number;
  topSellingItems?: string;
  cashVsDigital?: string;
}): string {
  let prompt = BASE_SYSTEM_INSTRUCTION;

  const dataParts: string[] = [];
  if (params.restaurantName) dataParts.push(`• রেস্তোরাঁর নাম: ${params.restaurantName}`);
  if (params.ownerName) dataParts.push(`• স্বত্বাধিকারী/মালিক: ${params.ownerName}`);
  if (params.address) dataParts.push(`• অবস্থান/ঠিকানা: ${params.address}`);
  if (params.menuSummary) dataParts.push(`• রেস্তোরাঁর আসল মেনু আইটেম ও মূল্য:\n${params.menuSummary}`);
  if (typeof params.todaySales === 'number') dataParts.push(`• আজকের মোট বিক্রি: ৳${params.todaySales} (${params.todayOrders || 0} টি মেমো)`);
  if (params.topSellingItems) dataParts.push(`• সর্বোচ্চ বিক্রিত খাবার: ${params.topSellingItems}`);
  if (params.cashVsDigital) dataParts.push(`• পেমেন্ট চ্যানেল অনুপাত: ${params.cashVsDigital}`);

  if (dataParts.length > 0) {
    prompt += `\n\n=== রেস্তোরাঁর রিয়েল-টাইম ডাটা প্রোফাইল (LIVE RESTAURANT DATA) ===\n${dataParts.join('\n')}\n=======================================================\nAlways refer to the above REAL data when answering. If the user asks about their menu, prices, or daily sales, use this exact live information.`;
  }

  return prompt;
}

// Model selection helper
function getModelName(mode?: string): string {
  if (mode === 'fast') {
    return 'gemini-3.1-flash-lite'; // Ultra-low latency
  }
  return 'gemini-3.8-flash'; // High-quality reasoning with low thinking latency
}

// 1. Streaming API Endpoint (Server-Sent Events) for lightning-fast real-time typing
app.post('/api/ai/stream', async (req, res) => {
  const { messages, mode, contextData } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(`data: ${JSON.stringify({ error: 'জেমিনি এপিআই কি কনফিগার করা নেই।' })}\n\n`);
    res.write('data: [DONE]\n\n');
    return res.end();
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'বার্তা তালিকা প্রদান করা আবশ্যক।' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const selectedModel = getModelName(mode);
  const contextualSystem = buildContextualInstruction(contextData || {});

  const contents = messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));

  try {
    const config: any = {
      systemInstruction: contextualSystem,
    };

    // Use ThinkingLevel.LOW on gemini-3.8-flash to minimize latency while keeping top quality
    if (selectedModel === 'gemini-3.8-flash') {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
    }

    const responseStream = await ai.models.generateContentStream({
      model: selectedModel,
      contents,
      config,
    });

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error(`Streaming error with model ${selectedModel}:`, error?.message);

    // Automatic fallback to gemini-3.1-flash-lite if gemini-3.8-flash had an issue
    if (selectedModel !== 'gemini-3.1-flash-lite') {
      try {
        console.log('Falling back to gemini-3.1-flash-lite for stream...');
        const fallbackStream = await ai.models.generateContentStream({
          model: 'gemini-3.1-flash-lite',
          contents,
          config: { systemInstruction: contextualSystem },
        });

        for await (const chunk of fallbackStream) {
          const text = chunk.text;
          if (text) {
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        }
        res.write('data: [DONE]\n\n');
        return res.end();
      } catch (fallbackErr: any) {
        console.error('Fallback stream also failed:', fallbackErr?.message);
      }
    }

    const friendlyError = 'দুঃখিত, এআই সার্ভারে সাময়িক সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।';
    res.write(`data: ${JSON.stringify({ error: friendlyError })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// 2. Standard Chat API Endpoint with auto-retry & structured suggestion parsing
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { messages, mode, contextData } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'জেমিনি এপিআই কি কনফিগার করা নেই। অনুগ্রহ করে সেটিংস প্যানেলে এপিআই কি সেট করুন।',
      });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'বার্তা তালিকা প্রদান করা আবশ্যক।' });
    }

    const selectedModel = getModelName(mode);
    const contextualSystem = buildContextualInstruction(contextData || {});

    const contents = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const config: any = {
      systemInstruction: contextualSystem,
    };

    if (selectedModel === 'gemini-3.8-flash') {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
    }

    let response;
    try {
      response = await ai.models.generateContent({
        model: selectedModel,
        contents,
        config,
      });
    } catch (primaryErr: any) {
      console.warn(`Primary model ${selectedModel} failed, trying gemini-3.1-flash-lite fallback...`, primaryErr?.message);
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents,
        config: { systemInstruction: contextualSystem },
      });
    }

    const rawText = response.text || 'দুঃখিত, কোনো উত্তর পাওয়া যায়নি। আবার প্রশ্ন করুন।';

    // Parse suggestions out of text
    const suggestions: string[] = [];
    const cleanedText = rawText.replace(/\[SUGGESTION:\s*([^\]]+)\]/g, (_, question) => {
      suggestions.push(question.trim());
      return ''; // remove from main display
    }).trim();

    return res.json({
      text: cleanedText,
      rawText,
      suggestions: suggestions.slice(0, 3),
      model: selectedModel,
    });
  } catch (error: any) {
    console.error('Gemini API Error in /api/ai/chat:', error);
    const errorMessage = error?.message || 'এআই এর সাথে যোগাযোগে সমস্যা হয়েছে।';
    return res.status(500).json({
      error: `এআই সার্ভার বার্তা: ${errorMessage}`,
    });
  }
});

// 3. Voice Order Dictation Parsing Endpoint (Audio + Transcript -> Structured Menu Items)
app.post('/api/ai/parse-voice-order', async (req, res) => {
  try {
    const { audioBase64, mimeType, transcript, menuItems } = req.body as {
      audioBase64?: string;
      mimeType?: string;
      transcript?: string;
      menuItems?: { id: string; name: string; price: number }[];
    };

    if (!Array.isArray(menuItems) || menuItems.length === 0) {
      return res.status(400).json({ error: 'মেনু আইটেম তালিকা পাওয়া যায়নি।' });
    }

    if (!audioBase64 && (!transcript || !transcript.trim())) {
      return res.status(400).json({ error: 'ভয়েস অডিও বা লেখা পাওয়া যায়নি।' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'জেমিনি এপিআই কি কনফিগার করা নেই।',
        code: 'NO_API_KEY',
      });
    }

    const menuText = menuItems
      .map(item => `- id: "${item.id}", name: "${item.name}", price: ${item.price}`)
      .join('\n');

    const prompt = `You are a restaurant cashier order dictation parser in Bangladesh.
Listen carefully to the staff member's voice order (spoken in Bengali, Banglish, or English) and/or read any draft transcript provided below, then map the dictated food items and quantities strictly to the restaurant's menu list.

Restaurant Menu:
${menuText}

${transcript ? `Draft browser speech transcript (may have minor errors): "${transcript}"` : ''}

Instructions:
1. Transcribe accurately what the staff member said into "transcript" (in natural Bengali or English as spoken).
2. Match each ordered item ONLY to an existing "id" from the Restaurant Menu above. Do not invent food IDs.
3. Convert Bengali/English spoken numbers ("দুইটা", "দুটো", "একটা", "তিনটি", "two", "3") into integer quantities >= 1. If quantity is omitted for a mentioned item, use 1.
4. If the same item is mentioned multiple times, combine or include each occurrence cleanly.
5. If a table number or customer name is explicitly spoken (e.g., "টেবিল ৩", "কাস্টমার রহিম"), return it in "customerName", otherwise return empty string "".`;

    const parts: any[] = [];
    if (audioBase64) {
      parts.push({
        inlineData: {
          mimeType: mimeType || 'audio/webm',
          data: audioBase64,
        },
      });
    }
    parts.push({ text: prompt });

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              transcript: { type: Type.STRING },
              customerName: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    foodId: { type: Type.STRING },
                    name: { type: Type.STRING },
                    quantity: { type: Type.INTEGER },
                  },
                  required: ['foodId', 'name', 'quantity'],
                },
              },
            },
            required: ['transcript', 'items'],
          },
        },
      });
    } catch (audioErr: any) {
      if (transcript && transcript.trim()) {
        console.warn('Audio decode failed, retrying text-only transcript parsing:', audioErr?.message);
        try {
          response = await ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: { parts: [{ text: prompt }] },
            config: {
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  transcript: { type: Type.STRING },
                  customerName: { type: Type.STRING },
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        foodId: { type: Type.STRING },
                        name: { type: Type.STRING },
                        quantity: { type: Type.INTEGER },
                      },
                      required: ['foodId', 'name', 'quantity'],
                    },
                  },
                },
                required: ['transcript', 'items'],
              },
            },
          });
        } catch {
          return res.json({
            transcript: transcript.trim(),
            customerName: '',
            items: [],
            fallbackToLocal: true,
          });
        }
      } else {
        throw audioErr;
      }
    }

    const parsed = JSON.parse(response.text || '{}') as {
      transcript?: string;
      customerName?: string;
      items?: { foodId: string; name: string; quantity: number }[];
    };

    const validMenuMap = new Map(menuItems.map(m => [m.id, m]));
    const validatedItems = (parsed.items || [])
      .filter(it => it && validMenuMap.has(it.foodId))
      .map(it => {
        const menuItem = validMenuMap.get(it.foodId)!;
        return {
          foodId: menuItem.id,
          name: menuItem.name,
          quantity: Math.max(1, Math.round(Number(it.quantity) || 1)),
        };
      });

    return res.json({
      transcript: (parsed.transcript || transcript || '').trim(),
      customerName: (parsed.customerName || '').trim(),
      items: validatedItems,
    });
  } catch (error: any) {
    console.error('Voice Order Parse Error:', error?.message || error);
    return res.status(500).json({
      error: 'ভয়েস অর্ডার বিশ্লেষণ করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার বলুন।',
    });
  }
});

// Setup Vite dev server middlewares or production static files
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`RestaurantHisab Server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
