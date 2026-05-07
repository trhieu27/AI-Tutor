export class QuizOption {
  constructor(
    public id,
    public text,
    public isCorrect
  ) {}
}

export class QuizQuestion {
  constructor(
    public id,
    public content,
    public options = [],
    public explanation, // Explanation for the correct answer
    public sourcePageOffset // Point back to the document page
  ) {}

  getCorrectOption() {
    return this.options.find(opt => opt.isCorrect);
  }
}

export class Quiz {
  constructor(
    public id,
    public documentId, // Generated from which document
    public title,
    public questions = [],
    public createdAt = new Date()
  ) {}

  getTotalQuestions() {
    return this.questions.length;
  }
}

export class QuizAttempt {
  constructor(
    public id,
    public quizId,
    public userId,
    public score = 0,
    public answers = [],
    public completedAt = new Date()
  ) {}

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
