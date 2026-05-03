import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function categorizeBookContent(title: string, content: string): Promise<string> {
  const prompt = `Anda adalah seorang pustakawan pakar. Baca tajuk dan kandungan bahan bacaan ringkas di bawah.
Sila berikan SATU KATEGORI SAHAJA (contoh: Fiksyen, Sains, Sejarah, Motivasi, Teknologi, Sastera) yang paling sesuai. 
Berikan hanya nama kategori.

Tajuk: ${title}
Kandungan: ${content.substring(0, 2000)}...`; // limit to save tokens

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text?.trim() || 'Umum';
  } catch (error) {
    console.error("Gemini categorization error:", error);
    return 'Umum';
  }
}
