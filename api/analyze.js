export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ingredients } = await req.json();

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a culinary safety and taste assistant. Answer in Vietnamese. Give a short, practical assessment of ingredient combinations, including taste, safety, health concerns, and recipe guidance.'
          },
          {
            role: 'user',
            content: `Analyze these ingredients: ${Array.isArray(ingredients) ? ingredients.join(', ') : ''}`
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: 'Groq request failed',
        details: data
      });
    }

    const result = data.choices?.[0]?.message?.content || 'No result';
    return res.status(200).json({ result });
  } catch (error) {
    return res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
}
