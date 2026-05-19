import { useState, useRef } from "react";
import { FilePdf, CheckCircle } from "@phosphor-icons/react";

export function UploadScreen({ onStart }) {
  const [file, setFile] = useState(null);
  const [over, setOver] = useState(false);
  const inputRef = useRef();

  const handleFile = (f) => {
    if (f?.type === "application/pdf") setFile(f);
  };

  return (
    <div className="page page-anim">
      <div className="page-narrow">

        {/* Heading */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-1)", marginBottom: 4, letterSpacing: "-0.2px" }}>
            Enviar Material
          </h2>
          <p style={{ fontSize: "0.88rem", color: "var(--text-3)" }}>
            Envie o arquivo PDF com as questões para iniciar o questionário.
          </p>
        </div>

        {/* Drop zone */}
        <div
          className={`upload-zone${over ? " over" : ""}`}
          role="button"
          tabIndex={0}
          aria-label="Área de upload. Arraste um PDF ou clique para selecionar."
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e)  => { e.preventDefault(); setOver(true); }}
          onDragLeave={()  => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            handleFile(e.dataTransfer.files[0]);
          }}
        >
          <div className="upload-icon-wrap">
            <FilePdf size={24} weight="regular" />
          </div>
          <p className="upload-title">Arraste o arquivo PDF aqui</p>
          <p className="upload-sub">ou clique para selecionar do seu computador</p>
          <p className="upload-hint">PDF · máximo 50 MB</p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          style={{ display: "none" }}
          aria-label="Selecionar arquivo PDF"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {/* Arquivo selecionado */}
        {file && (
          <div className="file-pill" role="status" aria-live="polite">
            <CheckCircle size={16} weight="fill" />
            {file.name}
          </div>
        )}

        {/* CTA */}
        <div style={{ marginTop: 28 }}>
          <button
            className="btn btn-primary btn-lg"
            style={{ width: "100%" }}
            disabled={!file}
            onClick={() => onStart(file)}
            aria-label="Iniciar questionário"
          >
            Iniciar Questionário
          </button>
        </div>

      </div>
    </div>
  );
}
