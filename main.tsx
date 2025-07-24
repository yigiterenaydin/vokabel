import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import UploadView from './components/UploadView';
import QuizView from './components/QuizView';
import ResultsView from './components/ResultsView';
// @ts-ignore: GoogleGenAI types may not be available
import { GoogleGenAI } from "@google/genai";
// import { FaGraduationCap } from 'react-icons/fa'; // kaldırıldı

// --- AI Setup ---
const API_KEY = 'AIzaSyBU-M-8N5DuIPeIVAv8Qvgtg5QzwdOfl1o';
const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- Helper Types ---
type QuizMode = 'gap' | 'clue' | 'translation';
type QuizStatus = 'correct' | 'close' | 'incorrect';
interface QuizItem {
  question: string;
  answer: string;
  originalWord: string;
}
interface QuizResult {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  status: QuizStatus;
  originalWord: string;
  correctStreak?: number; // eklendi
}

// --- AI Functions ---
async function extractWordsFromImage(imageData: string): Promise<string[]> {
  const prompt = "Analysiere das folgende Bild, extrahiere alle französischen oder englischen Wörter in einer Liste. Trenne die Wörter mit einem Komma. Ignoriere Zahlen oder Sätze. Gib nur die kommagetrennte Liste der Wörter zurück.";
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: imageData } },
          { text: prompt }
        ]
      },
    });
    const wordList = response.text
      ? response.text.split(',').map(word => word.trim().replace(/[".]/g, '')).filter(word => word.length > 1 && !/\d/.test(word))
      : [];
    return Array.from(new Set(wordList));
  } catch (error) {
    console.error("Error extracting words:", error);
    alert("Fehler beim Analysieren des Bildes. Bitte versuche es erneut.");
    return [];
  }
}
async function createGapText(word: any): Promise<string> {
  const prompt = `Erstelle aus dem Wort \"${word}\" eine Lückentext-Frage, um die Rechtschreibung zu testen. Ersetze etwa 30-50% der Buchstaben (aber nicht den ersten) mit Unterstrichen. Gib nur den Lückentext zurück. Beispiel: für \"Beispiel\" könntest du \"B__sp__l\" zurückgeben.`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text ? response.text.trim() : '';
  } catch (error) {
    console.error("Error creating gap text:", error);
    return word[0] + '_'.repeat(word.length - 1);
  }
}
async function createClueForWord(word: any): Promise<string> {
  const prompt = `Erstelle einen sehr kurzen, einfachen Hinweis oder eine Definition auf Deutsch für das Wort \"${word}\". Das Wort selbst darf nicht im Hinweis vorkommen. Gib nur den Hinweis zurück.`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text ? response.text.trim() : '';
  } catch (error) {
    console.error("Error creating clue:", error);
    return "Hinweis konnte nicht geladen werden.";
  }
}
async function getTranslation(word: string, from: string, to: string): Promise<string> {
  const prompt = `Übersetze das ${from}e Wort \"${word}\" nach ${to}. Antworte nur mit dem übersetzten Wort, ohne Artikel oder zusätzliche Erklärung.`;
  try {
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text ? response.text.trim() : '';
  } catch (error) {
    console.error(`Error translating ${word} from ${from} to ${to}:`, error);
    return "";
  }
}

// --- Levenshtein Distance for fuzzy matching ---
function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i++) { matrix[0][i] = i; }
  for (let j = 0; j <= b.length; j++) { matrix[j][0] = j; }
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

// --- Main App Component ---
const App = () => {
  // State'ler
  const [view, setView] = useState<'upload' | 'loading' | 'quiz' | 'results'>('upload');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [quizMode, setQuizMode] = useState<QuizMode>('gap');
  const [fromLang, setFromLang] = useState('Englisch');
  const [toLang, setToLang] = useState('Deutsch');
  const [langError, setLangError] = useState('');
  const [quizQueue, setQuizQueue] = useState<QuizItem[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [progress, setProgress] = useState('');
  const [questionLabel, setQuestionLabel] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [answer, setAnswer] = useState('');
  const [feedbackIcon, setFeedbackIcon] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackClass, setFeedbackClass] = useState('');
  const [checkAnswerDisabled, setCheckAnswerDisabled] = useState(false);
  const [scoreText, setScoreText] = useState('');
  const [mistakes, setMistakes] = useState<QuizResult[]>([]);
  // QuizQueue'da her kelime için doğru cevap sayacı tut
  const [correctStreaks, setCorrectStreaks] = useState<{[word: string]: number}>({});

  // Dosya seçme
  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        setBase64Image(result.split(',')[1]);
      };
      reader.onerror = () => {
        alert('Fehler beim Lesen des Bildes. Bitte versuche es erneut.');
      };
      reader.readAsDataURL(file);
    }
  };

  // Quiz başlatma
  const handleStartQuiz = async () => {
    if (!base64Image) return;
    if (quizMode === 'translation' && fromLang === toLang) {
      setLangError('Frage- und Antwortsprache dürfen nicht identisch sein.');
      return;
    }
    setLangError('');
    setView('loading');
    // 1. Kelimeleri çıkar
    const extractedWords = await extractWordsFromImage(base64Image);
    const limitedWords = extractedWords.slice(0, 10); // Sadece ilk 10 kelimeyle sınırla
    console.log("Çıkarılan kelimeler (ilk 10):", limitedWords); // <-- Eklendi
    setBase64Image(null);
    if (limitedWords.length === 0) {
      setView('upload');
      return;
    }
    // 2. Quiz sorularını hazırla
    let quizPairs: QuizItem[] = [];
    if (quizMode === 'translation') {
      const translations = await Promise.all(
        limitedWords.map(word => getTranslation(word, fromLang === 'Deutsch' ? toLang : fromLang, fromLang === 'Deutsch' ? fromLang : toLang))
      );
      if (fromLang === 'Deutsch') {
        quizPairs = limitedWords.map((originalWord, index) => ({
          question: translations[index],
          answer: originalWord,
          originalWord
        })).filter(pair => pair.question);
      } else {
        quizPairs = limitedWords.map((originalWord, index) => ({
          question: originalWord,
          answer: translations[index],
          originalWord
        })).filter(pair => pair.answer);
      }
    } else {
      quizPairs = limitedWords.map(word => ({
        question: '',
        answer: word,
        originalWord: word
      }));
    }
    if (quizPairs.length === 0) {
      alert('Quiz konnte nicht vorbereitet werden. Möglicherweise ist die Übersetzung fehlgeschlagen.');
      setView('upload');
      return;
    }
    // Karıştır
    quizPairs = shuffleArray(quizPairs);
    setQuizQueue(quizPairs);
    setQuizResults([]);
    setView('quiz');
    setTimeout(() => displayNextQuestion(quizPairs), 300);
  };

  // Sıradaki soruyu göster
  const displayNextQuestion = async (queue: QuizItem[] = quizQueue) => {
    if (queue.length === 0) {
      showResults();
      return;
    }
    setProgress(`Noch ${queue.length} Wörter`);
    setAnswer('');
    setFeedbackIcon('');
    setFeedbackText('');
    setFeedbackClass('');
    setCheckAnswerDisabled(false);
    setQuestionText('wird geladen...');
    let generatedQuestion = '';
    if (quizMode === 'clue') {
      setQuestionLabel('Welches Wort wird gesucht?');
      generatedQuestion = await createClueForWord(queue[0].answer);
    } else if (quizMode === 'translation') {
      setQuestionLabel(`Was ist die ${toLang}e Übersetzung?`);
      generatedQuestion = queue[0].question;
    } else {
      setQuestionLabel('Bitte ergänze das Wort:');
      generatedQuestion = await createGapText(queue[0].answer);
    }
    setQuestionText(generatedQuestion);
  };

  // Cevap kontrolü
  const handleCheckAnswer = () => {
    if (!answer) return;
    setCheckAnswerDisabled(true);
    const currentItem = quizQueue[0];
    const correctAnswer = currentItem.answer;
    let status: QuizStatus;
    let distance = levenshtein(answer.trim(), correctAnswer);
    let newQueue = quizQueue.slice(1);
    let streaks = {...correctStreaks};
    if (distance === 0) {
      status = 'correct';
      setFeedbackIcon('✅');
      setFeedbackText('Richtig!');
      setFeedbackClass('correct');
      streaks[currentItem.originalWord] = (streaks[currentItem.originalWord] || 0) + 1;
    } else if (distance <= 2 && correctAnswer.length > 3) {
      status = 'close';
      setFeedbackIcon('⚠️');
      setFeedbackText(`Fast richtig! Korrekt ist: ${correctAnswer}`);
      setFeedbackClass('close');
      streaks[currentItem.originalWord] = 0;
      newQueue.unshift(currentItem); // hemen tekrar sor
    } else {
      status = 'incorrect';
      setFeedbackIcon('❌');
      setFeedbackText(`Leider falsch. Korrekt ist: ${correctAnswer}`);
      setFeedbackClass('incorrect');
      streaks[currentItem.originalWord] = 0;
      newQueue.unshift(currentItem); // hemen tekrar sor
    }
    // Eğer doğru cevap 2'ye ulaşmadıysa tekrar sor
    if (streaks[currentItem.originalWord] < 2) {
      if (status === 'correct') newQueue.push(currentItem);
    }
    setCorrectStreaks(streaks);
    setQuizResults(prev => ([...prev, {
      question: questionText,
      userAnswer: answer,
      correctAnswer,
      status,
      originalWord: currentItem.originalWord,
      correctStreak: streaks[currentItem.originalWord]
    }]));
    setQuizQueue(newQueue);
    setTimeout(() => displayNextQuestion(newQueue), status === 'correct' ? 1200 : 2500);
  };

  // Sonuçları göster
  const showResults = () => {
    setView('results');
    const finalResults = new Map<string, QuizResult>();
    quizResults.forEach(result => {
      finalResults.set(result.originalWord, result);
    });
    const finalResultsArray = Array.from(finalResults.values());
    const correctCount = finalResultsArray.filter(r => r.status === 'correct').length;
    const closeCount = finalResultsArray.filter(r => r.status === 'close').length;
    const incorrectCount = finalResultsArray.filter(r => r.status === 'incorrect').length;
    const totalCount = finalResults.size;
    const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    setScoreText(`${correctCount} von ${totalCount} Wörtern gemeistert (${percentage}%)\n\n✅ Doğru: ${correctCount}\n⚠️ Yakın: ${closeCount}\n❌ Yanlış: ${incorrectCount}`);
    setMistakes(finalResultsArray.filter(r => r.status !== 'correct'));
  };

  // Quiz'i yeniden başlat
  const handleRestart = () => {
    setQuizQueue([]);
    setQuizResults([]);
    setImagePreview(null);
    setBase64Image(null);
    setAnswer('');
    setFeedbackIcon('');
    setFeedbackText('');
    setFeedbackClass('');
    setLangError('');
    setQuizMode('gap');
    setFromLang('Englisch');
    setToLang('Deutsch');
    setView('upload');
  };

  // Karıştırıcı
  function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // setQuizMode tipi
  const setQuizModeTyped = (mode: QuizMode) => setQuizMode(mode);

  // Görünüme göre component render et
  return (
    <main className="app-container">
      <header className="app-header">
        <h1>Intelligenter Vokabeltrainer 🎓</h1>
        <p className="app-subtitle">
          Eine App, die Schülern hilft, ihre Vokabeln durch Fotografieren von Wortlisten zu lernen.
        </p>
        <p className="app-sub-subtitle">
          Lerne deine englischen und französischen Vokabeln.
        </p>
      </header>
      {view === 'upload' && (
        <UploadView
          onFileSelect={handleFileSelect}
          onStartQuiz={handleStartQuiz}
          startQuizDisabled={!base64Image}
          imagePreview={imagePreview}
          quizMode={quizMode}
          setQuizMode={setQuizModeTyped}
          fromLang={fromLang}
          toLang={toLang}
          setFromLang={setFromLang}
          setToLang={setToLang}
          langError={langError}
        />
      )}
      {view === 'quiz' && (
        <QuizView
          progress={progress}
          questionLabel={questionLabel}
          questionText={questionText}
          answer={answer}
          onAnswerChange={setAnswer}
          onCheckAnswer={handleCheckAnswer}
          feedbackIcon={feedbackIcon}
          feedbackText={feedbackText}
          feedbackClass={feedbackClass}
          checkAnswerDisabled={checkAnswerDisabled}
          onAnswerKeyDown={e => {
            if (e.key === 'Enter' && !checkAnswerDisabled) handleCheckAnswer();
          }}
          current={quizResults.length + 1}
          total={quizQueue.length + quizResults.length}
        />
      )}
      {view === 'results' && (
        <ResultsView
          scoreText={scoreText}
          mistakes={mistakes}
          onRestart={handleRestart}
        />
      )}
      {view === 'loading' && (
        <section className="view active loading-view">
          <div className="spinner"></div>
          <p className="loading-text">Wörter werden analysiert...</p>
        </section>
      )}
    </main>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />); 