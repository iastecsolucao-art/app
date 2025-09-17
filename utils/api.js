const API_BASE = process.env.NEXT_PUBLIC_API_BASE; // precisa ser NEXT_PUBLIC para ser visível no front-end

export async function uploadFile(file, tipo) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("tipo", tipo); // <-- garantir que vai junto!

  try {
    const res = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      body: formData,
    });

    if (res.status === 200) {
      const data = await res.json();
      return { status: 200, msg: "✅ Importação com sucesso!", data };
    } else if (res.status >= 500) {
      return { status: 500, msg: "❌ Importação com erro, verifique os dados.", data: null };
    } else {
      const errorData = await res.text();
      return { status: res.status, msg: `⚠️ Erro inesperado (${res.status})`, data: errorData };
    }
  } catch (err) {
    console.error("Erro no upload:", err);
    return { status: 500, msg: "❌ Erro no servidor. Verifique a conexão.", data: null };
  }
}