/**
 * Quiz models — map API response to typed classes.
 *
 * API shape (array of):
 * { question: string, options: string[], correct_index: number, explanation: string }
 */
export class QuizQuestion {
  constructor({ question, options = [], correct_index, explanation }) {
    this.question      = question;
    this.options       = options;        // string[]
    this.correctIndex  = correct_index;
    this.explanation   = explanation;
  }

  /** Factory from raw API JSON */
  static fromJSON(json) {
    return new QuizQuestion(json);
  }

  /** Check if a given option index is the correct answer */
  isCorrect(optionIndex) {
    return optionIndex === this.correctIndex;
  }

  get correctAnswer() {
    return this.options[this.correctIndex] ?? null;
  }
}

export class Quiz {
  constructor(questions = []) {
    this.questions = questions; // QuizQuestion[]
  }

  /** Factory from raw API JSON array */
  static fromJSON(jsonArray) {
    const questions = jsonArray
      .filter(q => q?.question && Array.isArray(q?.options))
      .map(q => QuizQuestion.fromJSON(q));
    return new Quiz(questions);
  }

  get length() { return this.questions.length; }

  /** Calculate score given a map of { questionIndex: selectedOptionIndex } */
  calculateScore(userAnswers = {}) {
    let correct = 0;
    this.questions.forEach((q, idx) => {
      if (userAnswers[idx] !== undefined && q.isCorrect(userAnswers[idx])) correct++;
    });
    return correct;
  }
}
