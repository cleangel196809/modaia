export interface OpenAiChatMessage {
  role: 'system' | 'user';
  content: string;
}

/**
 * Llamada directa a la API de OpenAI (Chat Completions) vía fetch nativo — sin SDK,
 * para no añadir una dependencia solo por esto. Lanza si la respuesta no es 2xx;
 * quien la llama decide cómo caer al modo mock/plantillas.
 */
export async function callOpenAiChat(
  apiKey: string,
  model: string,
  messages: OpenAiChatMessage[],
  jsonMode = false,
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.8,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI API respondió ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI API no devolvió contenido');
  }
  return content;
}
