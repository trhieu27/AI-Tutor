export class QuizOption {
  constructor(id, text, isCorrect) {
    this.id = id;
    this.text = text;
    this.isCorrect = isCorrect;
  }
}
export class QuizQuestion {
  constructor(id, content, options = [], explanation,
  // Explanation for the correct answer
  sourcePageOffset // Point back to the document page
  ) {
    this.id = id;
    this.content = content;
    this.options = options;
    this.explanation = explanation;
    this.sourcePageOffset = sourcePageOffset;
  }
  getCorrectOption() {
    return this.options.find(opt => opt.isCorrect);
  }
}
export class Quiz {
  constructor(id, documentId,
  // Generated from which document
  title, questions = [], createdAt = new Date()) {
    this.id = id;
    this.documentId = documentId;
    this.title = title;
    this.questions = questions;
    this.createdAt = createdAt;
  }
  getTotalQuestions() {
    return this.questions.length;
  }
}
export class QuizAttempt {
  constructor(id, quizId, userId, score = 0, answers = [], completedAt = new Date()) {
    this.id = id;
    this.quizId = quizId;
    this.userId = userId;
    this.score = score;
    this.answers = answers;
    this.completedAt = completedAt;
  }
  calculateScore(quiz) {
    let correct = 0;
    this.answers.forEach(ans => {
      const question = quiz.questions.find(q => q.id === ans.questionId);
      if (question) {
        const selectedOpt = question.options.find(o => o.id === ans.selectedOptionId);
        if (selectedOpt && selectedOpt.isCorrect) correct++;
      }
    });
    this.score = correct;
    return correct;
  }
}