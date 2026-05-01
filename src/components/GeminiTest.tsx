import { useState } from "react";
import { analizarParteConGemini } from "@/services/geminiParteService";

export default function GeminiTest() {
  const [file, setFile] = useState<File | null>(null);
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);

    try {
      const data = await analizarParteConGemini(file);
      setResultado(data);
    } catch (error: any) {
      alert(error.message);
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Prueba Gemini</h2>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <button onClick={handleUpload} disabled={loading}>
        {loading ? "Analizando..." : "Analizar parte"}
      </button>

      <pre style={{ marginTop: 20 }}>
        {JSON.stringify(resultado, null, 2)}
      </pre>
    </div>
  );
}