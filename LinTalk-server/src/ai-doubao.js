const config = require('./config');

const limitMap = new Map();
const LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

function getCounter(userId) {
  const now = Date.now();
  const old = limitMap.get(userId);
  if (!old || old.expireAt <= now) {
    const init = { count: 0, expireAt: now + LIMIT_WINDOW_MS };
    limitMap.set(userId, init);
    return init;
  }
  return old;
}

async function askDoubao(userId, content) {
  const counter = getCounter(userId);

  if (config.doubaoCountLimit > 0 && counter.count + 1 > config.doubaoCountLimit) {
    return '您已经达到限制了，请24小时后再来吧~';
  }

  if (!content || !String(content).trim()) {
    return '内容不能为空~';
  }

  if (config.doubaoLengthLimit > 0 && String(content).length > config.doubaoLengthLimit) {
    return '问一些简单的问题吧~';
  }

  counter.count += 1;

  if (!config.doubaoApiKey) {
    return '豆包已离家出走了，请稍后再试~';
  }

  try {
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.doubaoApiKey}`
      },
      body: JSON.stringify({
        model: config.doubaoModel,
        messages: [
          {
            role: 'user',
            content: String(content)
          }
        ]
      })
    });

    const json = await response.json();
    const choices = Array.isArray(json.choices) ? json.choices : [];
    const text = choices
      .map((choice) => choice && choice.message && choice.message.content)
      .filter(Boolean)
      .join('\n')
      .trim();

    if (!text) {
      return '豆包已离家出走了，请稍后再试~';
    }

    return text;
  } catch {
    return '豆包已离家出走了，请稍后再试~';
  }
}

module.exports = {
  askDoubao
};
