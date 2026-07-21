// arallith-ai-proxy.js
//
// Что это: маленькая серверная функция-прокси между твоим сайтом и OpenAI.
// Она нужна ТОЛЬКО для одной вещи — спрятать API-ключ от браузера.
// Без неё ключ пришлось бы класть прямо в HTML, и любой посетитель
// сайта смог бы его украсть через вкладку Network в браузере.
//
// ==================== КАК РАЗВЕРНУТЬ (Vercel, бесплатно) ====================
//
// 1. Заведи аккаунт на vercel.com (можно через GitHub — тогда не нужен
//    отдельный пароль).
//
// 2. Создай новый пустой репозиторий на GitHub, например "arallith-proxy".
//    Внутри него создай папку "api" и положи туда этот файл под именем
//    "ask.js" — то есть путь должен быть:  api/ask.js
//
// 3. На vercel.com → "Add New Project" → выбери этот репозиторий.
//    Vercel сам всё определит, ничего настраивать не нужно — жми Deploy.
//
// 4. После деплоя зайди в настройки проекта на Vercel:
//    Settings → Environment Variables → добавь переменную:
//      имя:  OPENAI_API_KEY
//      значение: твой настоящий ключ (начинается на sk-...)
//    Нажми Save, потом на вкладке Deployments сделай "Redeploy"
//    (переменные применяются только после пересборки).
//
// 5. Vercel даст тебе адрес вида:
//      https://arallith-proxy.vercel.app
//    Твой рабочий адрес для запросов:
//      https://arallith-proxy.vercel.app/api/ask
//
// 6. Вставь этот адрес в arallith-dashboard.html вместо
//    "https://YOUR-PROXY-URL.vercel.app/api/ask" (переменная PROXY_URL)
//    и поменяй USE_REAL_API на true.
//
// Ключ теперь нигде не виден в браузере — он живёт только в
// Environment Variables на сервере Vercel.
// ==============================================================================
 
export default async function handler(req, res) {
  // Разрешаем запросы с любого источника (можно сузить до своего домена Framer)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
 
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Только POST-запросы' });
  }
 
  const { question, context } = req.body || {};
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Нужно поле question' });
  }
 
  const systemPrompt = `Ты — ИИ-ассистент панели мониторинга проекта Arallith.
${context || ''}
Отвечай кратко, по-русски, только по теме проекта Arallith и Аралкум.
Если не знаешь точного ответа — так и скажи, не выдумывай цифры.`;
 
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
        max_tokens: 350,
        temperature: 0.4,
      }),
    });
 
    const data = await response.json();
 
    if (!response.ok) {
      console.error('OpenAI error:', data);
      return res.status(502).json({ error: 'Ошибка модели' });
    }
 
    const answer = data.choices?.[0]?.message?.content?.trim() || 'Не удалось получить ответ.';
    return res.status(200).json({ answer });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Внутренняя ошибка прокси' });
  }
}
