import { useSpeech } from "../hooks/useSpeech"; 
import { SlidersHorizontal } from "@phosphor-icons/react";

export function AudioSettings() {
  const { voices, selectedVoiceURI, changeVoice, rate, changeRate, speak } = useSpeech();

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--r-lg)",
      padding: "20px 24px",
      marginBottom: "32px", 
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <SlidersHorizontal size={22} color="var(--primary, #4F46E5)" weight="regular" />
        <h2 style={{
          fontFamily: "var(--font)",
          fontSize: "1.05rem",
          fontWeight: 700,
          color: "var(--text-1)",
          letterSpacing: "-0.2px",
          margin: 0
        }}>
          Ajustes do Leitor de Voz
        </h2>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>
        {/* Controle de Voz */}
        <div style={{ flex: "1 1 250px" }}>
          <label style={{ display: "block", fontSize: "0.9rem", color: "var(--text-2)", marginBottom: "8px", fontWeight: 600 }}>
            Voz do Sistema
          </label>
          <select 
            className="text-input"
            value={selectedVoiceURI} 
            onChange={(e) => {
              changeVoice(e.target.value);
              setTimeout(() => speak("Voz alterada."), 200);
            }}
            style={{ width: "100%", cursor: "pointer" }}
          >
            {voices.length === 0 && <option>Carregando vozes...</option>}
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name.replace(/Microsoft |Google /g, "")} {/* Limpa o nome da voz */}
              </option>
            ))}
          </select>
        </div>

        {/* Controle de Velocidade */}
        <div style={{ flex: "1 1 250px" }}>
          <label style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", color: "var(--text-2)", marginBottom: "8px", fontWeight: 600 }}>
            <span>Velocidade de Leitura</span>
            <span style={{ color: "var(--primary, #4F46E5)" }}>{rate}x</span>
          </label>
          <input 
            type="range" 
            min="0.5" max="2.0" step="0.1" 
            value={rate} 
            onChange={(e) => changeRate(parseFloat(e.target.value))}
            onMouseUp={() => speak(`Velocidade ajustada para ${rate}`)}
            onTouchEnd={() => speak(`Velocidade ajustada para ${rate}`)} // Para celulares
            style={{ width: "100%", accentColor: "var(--primary, #4F46E5)", cursor: "grab" }}
          />
        </div>
      </div>
    </div>
  );
}