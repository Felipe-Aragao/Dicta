export function ExtractingScreen() {
  return (
    <div className="page-center page-anim">
      <div
        className="loading-wrap"
        role="status"
        aria-live="polite"
        aria-label="Extraindo questões do PDF, aguarde"
      >
        <div className="spinner" aria-hidden="true" />
        <div>
          <p className="loading-title">Extraindo questões</p>
          <p className="loading-sub">Lendo e processando seu material...</p>
        </div>
      </div>
    </div>
  );
}
