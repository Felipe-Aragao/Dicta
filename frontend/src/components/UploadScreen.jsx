import { useState, useRef } from "react";
import { FilePdf, CheckCircle, XCircle, SpinnerGap } from "@phosphor-icons/react";

// Tela de envio de PDF
export function UploadScreen({
  onStart,
  uploadStatus = "idle",
  uploadError = "",
  onFileSelected,
}) {
  const [file, setFile] = useState(null);
  const [over, setOver] = useState(false);
  
  const [numQuestions, setNumQuestions] = useState(5); 
  
  const inputRef = useRef();

  const handleFile = (f) => {
    if (f?.type === "application/pdf") {
      setFile(f);
      onFileSelected?.();
    }
  };

  const isLoading = uploadStatus === "loading";
  const isSuccess = uploadStatus === "success";
  const isError = uploadStatus === "error";

  return (
    <div className="page page-anim">
      <div className="page-narrow">

        {/* Cabecalho */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-1)", marginBottom: 4, letterSpacing: "-0.2px" }}>
            Enviar Material
          </h2>
          <p style={{ fontSize: "0.88rem", color: "var(--text-3)" }}>
            Envie o arquivo PDF com as questões para iniciar o questionário.
          </p>
        </div>

        {/* Area de upload */}
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
          <div>
            <div
              className={`file-pill${isLoading ? " loading" : ""}${isSuccess ? " success" : ""}${isError ? " error" : ""}`}
              role="status"
              aria-live="polite"
            >
              {isLoading ? (
                <SpinnerGap size={16} weight="bold" className="file-spinner" />
              ) : isError ? (
                <XCircle size={16} weight="fill" />
              ) : isSuccess ? (
                <CheckCircle size={16} weight="fill" />
              ) : (
                <FilePdf size={16} weight="regular" />
              )}
              {isLoading ? "Verificando PDF..." : file.name}
            </div>
            {isError && uploadError && (
              <div className="file-error" role="alert">
                {uploadError}
              </div>
            )}
          </div>
        )}

        {/* Seleção de quantidade de questões */}
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 8 }}>
          <label htmlFor="numQuestions" style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-2)" }}>
            Quantidade de questões a gerar:
          </label>
          <input 
            id="numQuestions"
            type="number" 
            min="1" 
            max="20" 
            value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
            style={{ 
              padding: "10px", 
              borderRadius: "8px", 
              border: "1px solid var(--border)",
              fontSize: "1rem",
              width: "100%"
            }}
          />
        </div>

        {/* Chamada para acao (Fluxo Real) */}
        <div style={{ marginTop: 28 }}>
          <button
            className="btn btn-primary btn-lg"
            style={{ width: "100%" }}
            disabled={!file || isLoading}
            /* Enviando o arquivo E o número de questões para o pai */
            onClick={() => onStart(file, numQuestions)}
            aria-label="Iniciar questionário"
          >
            Iniciar Questionário
          </button>
        </div>

      </div>
    </div>
  );
}