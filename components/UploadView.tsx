interface UploadViewProps {
  onFileSelect: (file: File) => void;
  onStartQuiz: () => void;
  startQuizDisabled: boolean;
  imagePreview: string | null;
  quizMode: 'gap' | 'clue' | 'translation';
  setQuizMode: (mode: 'gap' | 'clue' | 'translation') => void;
  fromLang: string;
  toLang: string;
  setFromLang: (lang: string) => void;
  setToLang: (lang: string) => void;
  langError: string;
}

const UploadView: React.FC<UploadViewProps> = ({
  onFileSelect,
  onStartQuiz,
  startQuizDisabled,
  imagePreview,
  quizMode,
  setQuizMode,
  fromLang,
  toLang,
  setFromLang,
  setToLang,
  langError
}) => {
  return (
    <section className="view active upload-view">
      <label htmlFor="file-input" className="drop-zone">
        <p className="upload-placeholder">📷 Bild hierher ziehen oder klicken</p>
        {imagePreview && <img src={imagePreview} className="image-preview" alt="Vorschau" style={{display:'block'}} />}
      </label>
      <input
        type="file"
        id="file-input"
        accept="image/png, image/jpeg"
        style={{ display: 'none' }}
        onChange={e => {
          if (e.target.files && e.target.files[0]) onFileSelect(e.target.files[0]);
        }}
      />
      <div className="card settings-card">
        <h4>Wähle einen Lernmodus:</h4>
        <div className="quiz-mode-selector">
          <div className="radio-group">
            <input type="radio" id="mode-gap" name="quiz-mode" value="gap" checked={quizMode==='gap'} onChange={()=>setQuizMode('gap')} />
            <label htmlFor="mode-gap">Rechtschreibung (Lückentext)</label>
          </div>
          <div className="radio-group">
            <input type="radio" id="mode-clue" name="quiz-mode" value="clue" checked={quizMode==='clue'} onChange={()=>setQuizMode('clue')} />
            <label htmlFor="mode-clue">Bedeutung (Hinweis-Rätsel)</label>
          </div>
          <div className="radio-group">
            <input type="radio" id="mode-translation" name="quiz-mode" value="translation" checked={quizMode==='translation'} onChange={()=>setQuizMode('translation')} />
            <label htmlFor="mode-translation">Übersetzung</label>
          </div>
        </div>
        {quizMode==='translation' && (
          <div className="translation-options" style={{display:'flex'}}>
            <div className="lang-selector">
              <label htmlFor="lang-from">Frage:</label>
              <select id="lang-from" value={fromLang} onChange={e=>setFromLang(e.target.value)}>
                <option value="Englisch">Englisch</option>
                <option value="Französisch">Französisch</option>
                <option value="Deutsch">Deutsch</option>
              </select>
            </div>
            <div className="lang-selector">
              <label htmlFor="lang-to">Antwort:</label>
              <select id="lang-to" value={toLang} onChange={e=>setToLang(e.target.value)}>
                <option value="Deutsch">Deutsch</option>
                <option value="Englisch">Englisch</option>
                <option value="Französisch">Französisch</option>
              </select>
            </div>
          </div>
        )}
        <p className="lang-error" style={{display: langError ? 'block' : 'none'}}>{langError}</p>
      </div>
      <button className="button" onClick={onStartQuiz} disabled={startQuizDisabled}>Quiz starten</button>
    </section>
  );
};

export default UploadView; 