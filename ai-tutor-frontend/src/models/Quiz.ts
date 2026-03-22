export class QuizOption {
  constructor(
    public id: string,
    public text: string,
    public isCorrect: boolean
  ) {}
}

export class QuizQuestion {
  constructor(
    public id: string,
    public content: string,
    public options: QuizOption[],
    public explanation?: string, // Explanation for the correct answer
    public sourcePageOffset?: number // Point back to the document page
  ) {}

  getCorrectOption(): QuizOption | undefined {
    return this.options.find(opt => opt.isCorrect);
  }
}

export class Quiz {
  constructor(
    public id: string,
    public documentId: string, // Generated from which document
    public title: string,
    public questions: QuizQuestion[],
    public createdAt: Date = new Date()
  ) {}

  getTotalQuestions(): number {
    return this.questions.length;
  }
}

export class QuizAttempt {
  constructor(
    public id: string,
    public quizId: string,
    public userId: string,
    public score: number = 0,
    public answers: { questionId: string; selectedOptionId: string }[] = [],
    public completedAt: Date = new Date()
  ) {}

  calculateScore(quiz: Quiz): number {
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
