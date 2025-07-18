import React from 'react';

interface QuizViewProps {
  progress: string;
  questionLabel: string;
  questionText: string;
  answer: string;
  onAnswerChange: (val: string) => void;
  onCheckAnswer: () => void;
  feedbackIcon: string;
  feedbackText: string;
  feedbackClass: string;
  checkAnswerDisabled: boolean;
  onAnswerKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const QuizView: React.FC<QuizViewProps> = ({
  progress,
  questionLabel,
  questionText,
  answer,
  onAnswerChange,
  onCheckAnswer,
  feedbackIcon,
  feedbackText,
  feedbackClass,
  checkAnswerDisabled,
  onAnswerKeyDown
}) => {
  return (
    <section className="view active quiz-view">
      <div className="quiz-header">
        <p className="progress-indicator">{progress}</p>
      </div>
      <div className="card quiz-card">
        <p className="question-label">{questionLabel}</p>
        <p className="question-text">{questionText}</p>
        <div className="answer-group">
          <input
            type="text"
            className="answer-input"
            placeholder="Deine Antwort..."
            autoComplete="off"
            value={answer}
            onChange={e => onAnswerChange(e.target.value)}
            onKeyDown={onAnswerKeyDown}
            disabled={checkAnswerDisabled}
          />
          <span className="feedback-icon">{feedbackIcon}</span>
        </div>
        <p className={`feedback-text ${feedbackClass}`}>{feedbackText}</p>
      </div>
      <button className="button" onClick={onCheckAnswer} disabled={checkAnswerDisabled}>Prüfen</button>
    </section>
  );
};

export default QuizView; 