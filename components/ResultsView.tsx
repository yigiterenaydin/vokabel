interface Mistake {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  originalWord: string;
}

interface ResultsViewProps {
  scoreText: string;
  mistakes: Mistake[];
  onRestart: () => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ scoreText, mistakes, onRestart }) => {
  return (
    <section className="view active results-view">
      <div className="card results-card">
        <h2>Ergebnis</h2>
        <p className="score-text">{scoreText}</p>
        <div className="mistakes-list">
          <h3>Deine Fehlerkorrekturen:</h3>
          {mistakes.length === 0 ? (
            <p>Super! Du hast alles gemeistert.</p>
          ) : (
            mistakes.map((result, idx) => (
              <div className="mistake-item" key={idx}>
                <p>Frage: <strong>{result.question}</strong></p>
                <p>Deine Antwort: <span className="user-answer">{result.userAnswer || "Keine Antwort"}</span></p>
                <p>Richtig wäre: <span className="correct-answer">{result.correctAnswer}</span></p>
              </div>
            ))
          )}
        </div>
      </div>
      <button className="button" onClick={onRestart}>Neue Runde</button>
    </section>
  );
};

export default ResultsView; 