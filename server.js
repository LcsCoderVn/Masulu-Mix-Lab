const express = require('express');
const path = require('path');

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

function buildLocalReport(ingredientsText) {
  const parts = String(ingredientsText || '')
    .split('+')
    .map(s => s.trim())
    .filter(Boolean);

  const total = Math.max(parts.length, 1);
  const calories = Math.max(180, total * 250);
  const protein = Math.max(12, total * 18);
  const carbs = Math.max(18, total * 24);
  const fat = Math.max(8, total * 10);

  return {
    title: parts.length > 1 ? 'Món Hỗn Hợp Cân Bằng' : 'Nguyên Liệu Đề Xuất',
    categoryBadge: 'PHÂN TÍCH LOCAL',
    badgeTone: 'green',
    compatibilityScore: 82,
    nutrition: {
      totalCalories: calories,
      protein,
      carbs,
      fat,
      fiber: 5,
      summary: 'Tổng lượng calo và dinh dưỡng nằm trong mức hợp lý cho 1 bữa ăn cân bằng.'
    },
    physicalState: 'Ổn định',
    visualRating: 'Tốt',
    phaseStability: 'Ổn định',
    executiveSummary: 'Hỗn hợp nguyên liệu này có khả năng ăn uống bình thường, dễ phối hợp và không tạo cảm giác quá nặng.',
    appearance: 'Màu sắc hài hòa, hỗn hợp không bị quá lỏng hay quá đặc.',
    textureDetail: 'Kết cấu mềm mịn, dễ ăn, không quá chua hay quá nhão.',
    tasteProfile: 'Món tạo cảm giác cân bằng giữa ngọt, mặn và dịu, dễ ăn hơn với nhiều người.',
    meters: { sweet: 36, sour: 22, salty: 42, bitter: 18, pungent: 16, fat: 32 },
    meterExplanations: {
      sweet: 'Hương vị ngọt vừa phải giúp món hấp dẫn và dễ chấp nhận hơn.',
      sour: 'Độ chua ở mức vừa phải tạo độ tươi cho món.',
      salty: 'Mặn và đậm đà giúp món có hương vị rõ ràng.',
      bitter: 'Độ đắng rất thấp, giúp không làm món quá cực đoan.',
      pungent: 'Độ cay nhẹ tạo cảm giác sôi động nhưng không “gây sốc”.',
      fat: 'Độ béo đủ để món mềm, bùi và dễ chịu khi ăn.'
    },
    benefits: [
      'Cung cấp năng lượng vừa phải cho bữa ăn.',
      'Cân bằng vị và kết cấu dễ ăn.',
      'Dễ tùy biến theo khẩu vị cá nhân.'
    ],
    risks: ['Nếu nguyên liệu quá mặn hoặc quá béo, nên giảm bớt khi ăn tiếp.'],
    protocol: 'Nếu món khá đậm, hãy bổ sung rau hoặc nước chấm nhẹ để cân bằng vị và giảm cảm giác nặng.'
  };
}

async function callGemini(ingredientsText) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY');
  }

  let fetchImpl = globalThis.fetch;
  if (!fetchImpl) {
    const imported = await import('node-fetch');
    fetchImpl = imported.default;
  }

  const response = await fetchImpl(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `Phân tích kết hợp nguyên liệu và tính dinh dưỡng theo định lượng: ${ingredientsText}` }]
        }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Gemini API request failed');
  }

  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Gemini returned no usable content');
  }

  let parsed;
  try {
    parsed = typeof rawText === 'string' ? JSON.parse(rawText) : rawText;
  } catch (jsonError) {
    parsed = buildLocalReport(ingredientsText);
  }

  return parsed;
}

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'masulu-mix-lab' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/analyze', async (req, res) => {
  const ingredientsText = String(req.body?.ingredients || '').trim();

  if (!ingredientsText) {
    return res.json(buildLocalReport(''));
  }

  try {
    const result = await callGemini(ingredientsText);
    return res.json(result);
  } catch (error) {
    console.error('[AI proxy]', error.message);
    return res.json(buildLocalReport(ingredientsText));
  }
});

app.listen(port, () => {
  console.log(`Masulu Mix Lab is running on http://localhost:${port}`);
});
