export const GLOBAL_METADATA_TEXTS = {
  title: "AI Tutor - Hệ thống học tập thông minh",
  description: "Phân tích, tóm tắt và thực hành trắc nghiệm dựa trên tài liệu của bạn với AI."
};

export const SIDEBAR_TEXTS = {
  brand: {
    title: "AI Tutor",
    subtitle: "Học tập thông minh"
  },
  dashboard: "Tổng quan",
  learning: "Thư viện học tập",
  practice: "Luyện tập",
  mindmap: "Sơ đồ tư duy",
  uploadBtn: "Thêm tài liệu",
  settings: "Cài đặt",
  support: "Trợ giúp",
  upgrade: {
    header: "Nâng cấp phiên bản Pro",
    title: "Nâng cấp PRO",
    desc: "Mở khóa mọi tính năng AI."
  }
};

export const HEADER_TEXTS = {
  searchPlaceholder: "Tìm kiếm tài liệu, bài giảng...",
  userName: "Trần Hiếu",
  proBadge: "Phiên bản PRO",
  logout: "Đăng xuất",
  notifications: {
    title: "Thông báo",
    markAsRead: "Đã đọc",
    clearAll: "Xóa hết",
    empty: "Không có thông báo mới",
    viewAll: "Xem toàn bộ"
  },
  user: {
    defaultName: "Người dùng",
    notLoggedIn: "Chưa đăng nhập",
    idPrefix: "ID: "
  }
};

export const UPLOAD_AREA_TEXTS = {
  title: "Tải lên giáo trình của bạn",
  descriptionPrefix: "Kéo và thả file tại đây hoặc",
  selectFileLink: "duyệt file từ máy tính",
  maxSizeDesc: "Tối đa 50MB",
  acceptedTypes: "PDF, DOC, DOCX",
  status: {
    uploading: "Đang tải lên & xử lý...",
    success: "Tải lên thành công!",
    processingBg: "Đang xử lý RAG trong nền...",
    error: "Tải lên thất bại"
  }
};

export const DOCUMENT_TABLE_TEXTS = {
  title: "Thư viện tài liệu",
  colName: "Tên tài liệu",
  colDate: "Ngày tải lên",
  colStatus: "Trạng thái",
  colActions: "Thao tác",
  status: {
    processed: "Đã xử lý",
    extracting: "AI đang phân tích...",
    uploading: "Đang tải lên...",
    failed: "Thất bại"
  },
  empty: {
    title: "Thư viện đang trống",
    subtitle: "Bắt đầu hành trình học tập bằng cách tải lên tài liệu đầu tiên của bạn ở phía bên trái.",
    hint: "Hỗ trợ định dạng PDF, DOC, DOCX tối đa 50MB"
  }
};

export const AUTH_TEXTS = {
  LOGIN: {
    HERO_TITLE: "AI TUTOR",
    HERO_QUOTE: "Nền tảng học tập thông minh dựa trên trí tuệ nhân tạo thế hệ mới.",
    WELCOME_TITLE: "Chào mừng trở lại!",
    WELCOME_SUBTITLE: "Vui lòng nhập thông tin để truy cập vào hệ thống",
    CONTINUE_WITH_GOOGLE: "Tiếp tục với Google",
    OR_LOGIN_WITH_EMAIL: "Hoặc đăng nhập với email",
    EMAIL_LABEL: "Địa chỉ Email",
    EMAIL_PLACEHOLDER: "example@email.com",
    PASSWORD_LABEL: "Mật khẩu",
    FORGOT_PASSWORD: "Quên mật khẩu?",
    PASSWORD_PLACEHOLDER: "••••••••",
    LOGIN_BUTTON: "Đăng nhập",
    LOGIN_LOADING: "Đang xử lý...",
    LOGIN_ERROR: "Email hoặc mật khẩu không chính xác.",
    RATE_LIMIT_COUNTDOWN: (seconds: number) => `Thử quá nhiều lần. Vui lòng thử lại sau ${seconds} giây.`,
    NO_ACCOUNT: "Bạn chưa có tài khoản?",
    REGISTER_NOW: "Đăng ký ngay"
  },
  FORGOT_PASSWORD: {
    TITLE: "Quên mật khẩu",
    SUBTITLE: "Đừng lo, hãy nhập email để AI Tutor giúp bạn lấy lại quyền truy cập",
    EMAIL_LABEL: "Email khôi phục",
    EMAIL_PLACEHOLDER: "example@email.com",
    BUTTON: "Gửi mã xác nhận",
    LOADING: "Đang gửi...",
    SUCCESS_MSG: "Yêu cầu đã được gửi! Vui lòng kiểm tra email của bạn.",
    ERROR: "Email không hợp lệ hoặc không tồn tại.",
    OTP_TITLE: "Kiểm tra Email",
    OTP_SUBTITLE: (email: string) => `Chúng tôi đã gửi mã xác nhận đến ${email}`,
    OTP_LABEL: "Mã xác nhận (6 chữ số)",
    VERIFY_OTP: "Xác thực mã",
    VERIFYING: "Đang xác thực...",
    RESET_TITLE: "Mật khẩu mới",
    RESET_SUBTITLE: "Hãy chọn một mật khẩu mạnh để bảo vệ tài khoản của bạn",
    NEW_PASSWORD: "Mật khẩu mới",
    CONFIRM_NEW_PASSWORD: "Xác nhận mật khẩu mới",
    RESET_BUTTON: "Cập nhật mật khẩu",
    RESET_LOADING: "Đang cập nhật...",
    SUCCESS_TITLE: "Xong rồi!",
    RESET_SUCCESS: "Đổi mật khẩu thành công! Vui lòng đăng nhập lại.",
    BACK_TO_LOGIN: "Quay lại Đăng nhập"
  },
  REGISTER: {
    PASSWORD_MISMATCH: "Mật khẩu xác nhận không khớp.",
    REGISTER_ERROR: "Đăng ký thất bại. Vui lòng thử lại.",
    VERIFY_ERROR: "Mã xác nhận không đúng.",
    WELCOME_TITLE: "Tạo tài khoản mới 🚀",
    WELCOME_SUBTITLE: "Bắt đầu hành trình học tập thông minh ngay hôm nay",
    CONTINUE_WITH_GOOGLE: "Đăng ký với Google",
    OR_REGISTER_WITH_EMAIL: "Hoặc đăng ký bằng email",
    NAME_LABEL: "Họ và tên",
    NAME_PLACEHOLDER: "Nguyễn Văn A",
    EMAIL_LABEL: "Địa chỉ Email",
    EMAIL_PLACEHOLDER: "example@email.com",
    PASSWORD_LABEL: "Mật khẩu",
    PASSWORD_PLACEHOLDER: "Tối thiểu 8 ký tự",
    CONFIRM_PASSWORD_LABEL: "Xác nhận mật khẩu",
    CONFIRM_PASSWORD_PLACEHOLDER: "••••••••",
    REGISTER_BUTTON: "Đăng ký tài khoản",
    REGISTER_LOADING: "Đang tạo tài khoản...",
    HAVE_ACCOUNT: "Bạn đã có tài khoản?",
    LOGIN_NOW: "Đăng nhập ngay",
    VERIFY_TITLE: "Xác thực Email ✉️",
    VERIFY_SUBTITLE: "Chúng tôi đã gửi mã 6 số đến email của bạn",
    VERIFY_CODE_LABEL: "Mã xác thực",
    VERIFY_CODE_PLACEHOLDER: "000000",
    VERIFY_BUTTON: "Xác thực tài khoản",
    VERIFY_LOADING: "Đang xác thực...",
    RESEND_CODE: "Gửi lại mã xác nhận"
  },
  GOOGLE: {
    SUCCESS: "Đăng nhập Google thành công!",
    ERROR: "Đăng nhập bằng Google thất bại"
  }
};

export const DASHBOARD_TEXTS = {
  welcome: {
    title: "Nâng tầm tri thức cùng AI Tutor",
    subtitle: "Tải lên tài liệu của bạn và để trí tuệ nhân tạo giúp bạn học tập, tra cứu và luyện tập hiệu quả gấp 10 lần."
  },
  features: {
    chat: {
      title: "Hỏi đáp với AI",
      desc: "Tra cứu kiến thức và giải đáp thắc mắc chuyên sâu."
    },
    practice: {
      title: "Luyện tập câu hỏi",
      desc: "Tự tạo đề thi trắc nghiệm để đánh giá năng lực."
    },
    summary: {
      title: "Tóm tắt thông minh",
      desc: "Nắm bắt các ý chính chỉ trong vài giây."
    },
    mindmap: {
      title: "Sơ đồ tư duy",
      desc: "Trực quan hóa cấu trúc kiến thức của tài liệu."
    },
    questions: {
      title: "Câu hỏi ôn tập",
      desc: "Tổng hợp các câu hỏi mở để ôn tập kiến thức sâu."
    }
  },
  upload: {
    title: "Tải tài liệu mới",
    tip: "Hỗ trợ file PDF lên đến 50MB. AI sẽ tự động phân tích và sẵn sàng hỗ trợ bạn sau vài giây."
  }
};

export const LEARNING_PAGE_TEXTS = {
  header: {
    title: "Thư viện học tập",
    subtitle: "Chọn một tài liệu để bắt đầu phân tích, tóm tắt và đặt câu hỏi chuyên sâu cùng AI Tutor."
  },
  cards: {
    query: {
      title: "Truy vấn Kiến thức",
      desc: "Hỏi và đáp dựa trên nội dung chính xác từ tài liệu của bạn."
    },
    summary: {
      title: "Tóm tắt Thông minh",
      desc: "Tự động trích xuất các ý chính và sơ đồ hóa kiến thức phức tạp."
    },
    quiz: {
      title: "Luyện tập & Đánh giá",
      desc: "Tạo đề thi trắc nghiệm từ tài liệu để kiểm tra mức độ hiểu bài."
    }
  }
};


export const CHAT_TEXTS = {
  SIDEBAR: {
    TITLE: "Lịch sử hội thoại",
    NEW_CHAT_TOOLTIP: "Đoạn chat mới",
    NO_SESSIONS: "Chưa có lịch sử chat nào cho tài liệu này.",
  },
  HEADER: {
    AI_READY: "Active",
    LOADING_DOC: "Đang tải tài liệu...",
    ACTIONS: {
      SUMMARY: "Tóm tắt",
      QUIZ: "Luyện tập",
      MINDMAP: "Sơ đồ tư duy",
      MINDMAP_TOOLTIP: "Sơ đồ tư duy",
      QUESTIONS_TOOLTIP: "Câu hỏi ôn tập",
    }
  },
  WELCOME: {
    TITLE: "AI Tutor đang lắng nghe!",
    SUBTITLE: "Tôi đã đọc xong tài liệu của bạn. Bạn muốn bắt đầu từ đâu? Hãy chọn một gợi ý hoặc đặt câu hỏi trực tiếp nhé!",
    SUGGESTIONS: [
      "Nội dung chính của tài liệu này là gì?",
      "Liệt kê các khái niệm quan trọng nhất",
      "Giải thích các thuật ngữ chuyên ngành",
      "Mục đích cốt lõi của chương này"
    ]
  },
  MESSAGES: {
    USER_LABEL: "Học sinh",
    AI_LABEL: "AI Tutor",
    AI_ANALYZING: "AI đang phân tích...",
    SOURCE_PAGE: "Trang",
    EXTRACT_FROM: "Đoạn trích từ trang"
  },
  INPUT: {
    PLACEHOLDER: "Đặt câu hỏi về tài liệu này...",
    COMMAND_HINT: "Sử dụng ký hiệu / để xem các lệnh nhanh",
    DISCLAIMER: "AI có thể sai sót, hãy kiểm chứng thông tin."
  },
  MODALS: {
    TITLES: {
      SUMMARY: "Tóm tắt tài liệu",
      MINDMAP: "Sơ đồ tư duy",
      QUESTIONS: "Câu hỏi ôn tập",
      QUIZ: "Bài kiểm tra trắc nghiệm"
    },
    LOADING: {
      SUMMARY: "AI đang phân tích và tóm tắt...",
      MINDMAP: "AI đang thiết kế sơ đồ tư duy...",
      QUESTIONS: "AI đang soạn danh sách câu hỏi ôn tập...",
      QUIZ: "AI đang soạn bộ câu hỏi trắc nghiệm..."
    },
    EMPTY: {
      SUMMARY: "Chưa có bản tóm tắt cho tài liệu này. Vui lòng thử lại sau nhé.",
      MINDMAP: "Chưa thể tạo sơ đồ tư duy. Vui lòng quay lại sau ít phút.",
      QUESTIONS: "Hệ thống đang chuẩn bị bộ câu hỏi ôn tập. Vui lòng thử lại sau.",
      QUIZ: "Hệ thống chưa thể tạo bài kiểm tra ngay lúc này. Vui lòng thử lại sau hoặc đặt câu hỏi để AI hiểu tài liệu hơn nhé."
    },
    BUTTONS: {
      CLOSE: "Đóng",
      DOWNLOAD_SUMMARY: "Tải bản tóm tắt"
    },
    QUESTIONS_HINT: "Dưới đây là các câu hỏi giúp bạn tự ôn tập và nắm vững kiến thức từ tài liệu. Bạn có thể sử dụng khung chat để trả lời hoặc yêu cầu AI giải thích thêm.",
    ASK_AI_TOOLTIP: "Hỏi AI về câu này"
  }
};

export const MINDMAP_LIST_TEXTS = {
  title: "Sơ đồ tư duy",
  subtitle: "Chọn một tài liệu để tạo sơ đồ tư duy (Mindmap). AI sẽ giúp bạn trực quan hóa các mối liên hệ giữa các khái niệm chính trong bài học.",
  heroTitle: "Vì sao nên dùng Sơ đồ tư duy?",
  heroDesc: "Sơ đồ tư duy giúp bạn ghi nhớ lâu hơn thông qua việc liên kết các hình ảnh và từ khóa. AI của chúng tôi sẽ tự động phân loại các cấp độ kiến thức từ chủ đề lớn đến các ý con, giúp bạn có cái nhìn tổng quát về toàn bộ tài liệu chỉ trong vài giây.",
  EDITOR: {
    TITLE: "Công cụ Mindmap",
    LABEL: "Trình chỉnh sửa",
    EDIT_BTN: "Chỉnh sửa nội dung",
    PLACEHOLDER: "Nhập mã Mermaid mindmap tại đây...",
    APPLY: "Cập nhật",
    CANCEL: "Hủy",
    TIPS_TITLE: "Mẹo sử dụng",
    TIPS_DESC: "Bạn có thể tự thêm các nhánh mới bằng cách xuống dòng và thêm thụt đầu dòng (tabs) trong trình chỉnh sửa. Ví dụ:",
    EXAMPLE_NODE: "Nhánh mới",
    EXAMPLE_CHILD: "Ý con 1",
    PRINT: "Lưu sơ đồ/In"
  },
  CONTROLS: {
    OPEN_EDITOR: "Mở trình sửa",
    CLOSE_EDITOR: "Đóng trình sửa",
    ZOOM_IN: "Phóng to",
    ZOOM_OUT: "Thu nhỏ",
    RESET_ZOOM: "Reset Zoom",
    REFRESH: "Làm mới sơ đồ từ AI",
    CUSTOM: "Tùy chỉnh",
    CLOSE: "Đóng",
    DOWNLOAD: "Xuất file",
    RESET_VIEW: "Căn giữa sơ đồ"
  },
  GUIDE: {
    TITLE: "Thao tác",
    DESC: "Cầm kéo để di chuyển • Lăn chuột để thu phóng"
  },
  STATUS: {
    LOADING: "AI đang thiết kế sơ đồ...",
    DOC_LABEL: "Tài liệu:",
    FOOTER_TIP: "Mẹo: Sử dụng con lăn chuột hoặc các phím (+) (-) để thu phóng sơ đồ."
  }
};

export const PRACTICE_PAGE_TEXTS = {
  title: "Luyện tập trắc nghiệm",
  subtitle: "Thử thách bản thân với các bài kiểm tra trắc nghiệm được tạo tự động từ nội dung tài liệu.",
  cards: {
    activeLearning: {
      title: "Học tập chủ động",
      desc: "Thay vì chỉ đọc, hãy trả lời câu hỏi để kích hoạt bộ nhớ và hiểu sâu bản chất vấn đề."
    },
    expertExplanations: {
      title: "Giải thích chi tiết",
      desc: "Mỗi câu hỏi đều đi kèm lời giải thích tại sao đúng/sai, giúp bạn học ngay từ những lỗi sai."
    }
  }
};

export const ERROR_MESSAGES = {
  GENERAL: "Hệ thống đang bận hoặc gặp lỗi xử lý. Vui lòng thử lại sau.",
  QUOTA_EXCEEDED: "Bạn đã hết lượt sử dụng AI miễn phí trong hôm nay. Vui lòng quay lại sau hoặc nâng cấp tài khoản.",
  MODEL_NOT_AVAILABLE: "Mô hình AI hiện đang được bảo trì hoặc không khả dụng. Vui lòng thử lại sau ít phút.",
  NETWORK_ERROR: "Lỗi kết nối máy chủ. Vui lòng kiểm tra lại đường truyền mạng của bạn.",
  CANCELLED: "Tác vụ đã được hủy theo yêu cầu của người dùng."
};

export const QUOTA_TEXTS = {
  exceeded: {
    title: "Đã hết lượt sử dụng",
    chat: "Bạn đã dùng hết lượt chat miễn phí hôm nay.",
    ai: "Bạn đã dùng hết lượt tạo nội dung AI miễn phí hôm nay.",
    desc: "Nâng cấp Pro để sử dụng không giới hạn hoặc quay lại vào ngày mai.",
    upgradeBtn: "Nâng cấp Pro",
    laterBtn: "Để sau",
  },
  upgrade: {
    title: "Nâng cấp Pro",
    subtitle: "Mở khóa toàn bộ sức mạnh AI Tutor",
    currentPlan: "Gói hiện tại",
    freePlan: "Miễn phí",
    proPlan: "Pro",
    proBadge: "Đang sử dụng",
    features: [
      { icon: "chat", text: "Chat không giới hạn", free: "30 tin/ngày", pro: "Không giới hạn" },
      { icon: "auto_awesome", text: "Tạo nội dung AI", free: "10 lượt/ngày", pro: "Không giới hạn" },
      { icon: "upload_file", text: "Tài liệu", free: "Tối đa 3 file", pro: "Không giới hạn" },
    ],
    activateBtn: "Kích hoạt Pro",
    activating: "Đang kích hoạt...",
    successMsg: "Chúc mừng! Bạn đã nâng cấp thành công lên Pro 🎉",
    alreadyPro: "Bạn đang sử dụng gói Pro",
  },
};

export const QUIZ_PAGE_TEXTS = {
  header: {
    badge: "Kiểm tra trắc nghiệm",
    completed: "Đã hoàn thành",
    scoreBadge: (score: number, total: number) => `${score} / ${total} câu đúng`,
    retake: "Làm lại"
  },
  status: {
    loading: {
      title: "Đang chuẩn bị bài thi...",
      desc: "AI đang trích xuất câu hỏi từ tài liệu của bạn"
    },
    error: {
      title: "Lỗi tải bài thi",
      back: "Quay lại"
    }
  },
  results: {
    title: "Kết quả bài thi",
    expertExplanation: "Giải thích chi tiết",
    perfect: "Tuyệt vời! Bạn đã nắm vững kiến thức từ tài liệu này.",
    good: "Khá tốt! Bạn đã hiểu phần lớn nội dung quan trọng.",
    keepTrying: "Cần cố gắng thêm. Hãy xem lại phần giải thích để củng cố kiến thức.",
    correct: "Đúng",
    incorrect: "Sai"
  },
  actions: {
    submit: "Nộp bài và xem đáp án",
    confirmIncomplete: "Bạn chưa hoàn thành hết tất cả câu hỏi. Vẫn muốn nộp bài?"
  }
};

export const HELP_PAGE_TEXTS = {
  hero: {
    badge: "Trung tâm hỗ trợ",
    title: "Chúng tôi ở đây để ",
    titleHighlight: "giúp bạn",
    subtitle: "Tìm câu trả lời nhanh, khám phá hướng dẫn sử dụng chi tiết, và liên hệ trực tiếp đội ngũ hỗ trợ kỹ thuật."
  },
  tabs: {
    faq: "Câu hỏi thường gặp",
    guide: "Hướng dẫn sử dụng",
    contact: "Liên hệ hỗ trợ"
  },
  faq: {
    searchPlaceholder: "Tìm kiếm câu hỏi...",
    allCategory: "Tất cả",
    noResults: "Không tìm thấy kết quả cho",
    clearFilter: "Xóa bộ lọc",
    items: [
      {
        question: "AI Tutor hoạt động như thế nào?",
        answer: "AI Tutor sử dụng công nghệ RAG (Retrieval-Augmented Generation) kết hợp với mô hình ngôn ngữ lớn (LLM) để phân tích tài liệu của bạn. Sau khi bạn tải lên, hệ thống sẽ 'đọc' và ghi nhớ nội dung, giúp bạn có thể trò chuyện, đặt câu hỏi, soạn đề thi hoặc tóm tắt tài liệu đó một cách chính xác.",
        icon: "auto_awesome",
        category: "Tổng quan"
      },
      {
        question: "Tôi có thể tải lên các định dạng tệp nào?",
        answer: "Hiện tại hệ thống hỗ trợ định dạng PDF với dung lượng tối đa 50MB. Bạn chỉ cần kéo thả hoặc chọn file PDF từ máy tính, AI sẽ tự động phân tích và sẵn sàng hỗ trợ bạn sau vài giây.",
        icon: "upload_file",
        category: "Tài liệu"
      },
      {
        question: "Làm thế nào để tạo Sơ đồ tư duy hiệu quả?",
        answer: "Sau khi tài liệu được xử lý thành công, hãy chọn tính năng 'Sơ đồ tư duy' từ thanh điều hướng hoặc trong mục Thư viện học tập. Hệ thống sẽ tự động trích xuất các ý chính và phân cấp chúng thành một sơ đồ trực quan. Bạn có thể tương tác, chỉnh sửa trực tiếp, phóng to/thu nhỏ, và xuất sơ đồ ra file ảnh.",
        icon: "hub",
        category: "Tính năng"
      },
      {
        question: "Bài kiểm tra trắc nghiệm được tạo ra như thế nào?",
        answer: "AI sẽ phân tích toàn bộ nội dung tài liệu và tự động tạo ra các câu hỏi trắc nghiệm bao quát nhiều khía cạnh kiến thức. Mỗi câu hỏi đều kèm theo đáp án đúng và lời giải thích chi tiết, giúp bạn hiểu rõ tại sao đáp án đó lại đúng/sai.",
        icon: "assignment",
        category: "Tính năng"
      },
      {
        question: "Tôi có thể sử dụng AI Tutor trên điện thoại không?",
        answer: "Có! Giao diện AI Tutor được thiết kế responsive, hoạt động tốt trên mọi kích thước màn hình từ điện thoại, máy tính bảng cho đến máy tính để bàn. Bạn chỉ cần truy cập thông qua trình duyệt web.",
        icon: "devices",
        category: "Tổng quan"
      }
    ]
  },
  guide: {
    stepsLabel: "Các bước sử dụng",
    stepLabel: "Bước",
    prevButton: "Quay lại",
    nextButton: "Tiếp theo",
    steps: [
      {
        title: "Tải lên tài liệu",
        description: "Truy cập Tổng quan, kéo thả hoặc chọn file PDF từ máy tính. AI sẽ tự động phân tích và xử lý tài liệu trong vài giây.",
        icon: "cloud_upload",
        color: "from-blue-500 to-indigo-600"
      },
      {
        title: "Chat hỏi đáp với AI",
        description: "Vào Thư viện học tập, chọn tài liệu và bắt đầu đặt câu hỏi. AI sẽ trả lời dựa trên nội dung chính xác từ tài liệu của bạn.",
        icon: "forum",
        color: "from-violet-500 to-purple-600"
      },
      {
        title: "Tóm tắt thông minh",
        description: "Nhấn nút 'Tóm tắt' trong trang chat để AI trích xuất các ý chính và tạo bản tóm tắt súc tích cho toàn bộ tài liệu.",
        icon: "summarize",
        color: "from-amber-500 to-orange-600"
      },
      {
        title: "Luyện tập trắc nghiệm",
        description: "Truy cập mục Luyện tập, chọn tài liệu để AI tự động tạo bài kiểm tra. Sau khi nộp bài, AI sẽ giải thích từng câu hỏi.",
        icon: "quiz",
        color: "from-rose-500 to-pink-600"
      },
      {
        title: "Tạo sơ đồ tư duy",
        description: "Chọn Sơ đồ tư duy từ thanh điều hướng, chọn tài liệu và xem AI trực quan hóa các khái niệm. Bạn có thể chỉnh sửa và xuất file.",
        icon: "hub",
        color: "from-emerald-500 to-teal-600"
      },
      {
        title: "Câu hỏi ôn tập",
        description: "Sử dụng tính năng câu hỏi ôn tập để AI tạo các câu hỏi mở giúp bạn tự kiểm tra kiến thức và chuẩn bị cho kỳ thi.",
        icon: "psychology",
        color: "from-cyan-500 to-blue-600"
      }
    ]
  },
  contact: {
    formTitle: "Gửi yêu cầu hỗ trợ",
    formSubtitle: "Mô tả vấn đề bạn gặp phải, chúng tôi sẽ phản hồi qua email.",
    subjectLabel: "Tiêu đề",
    subjectPlaceholder: "Ví dụ: Lỗi khi tải lên tài liệu PDF",
    messageLabel: "Nội dung chi tiết",
    messagePlaceholder: "Mô tả chi tiết vấn đề bạn đang gặp phải...",
    charCount: "ký tự",
    submitButton: "Gửi yêu cầu hỗ trợ",
    successToast: "Yêu cầu hỗ trợ đã được gửi thành công! Chúng tôi sẽ phản hồi trong 24 giờ.",
    errors: {
      subjectRequired: "Vui lòng nhập tiêu đề",
      messageRequired: "Vui lòng nhập nội dung",
      messageMinLength: "Nội dung cần ít nhất 20 ký tự"
    }
  }
};

export const SETTINGS_PAGE_TEXTS = {
  page: {
    title: "Cài đặt",
    subtitle: "Quản lý tài khoản, bảo mật và trải nghiệm"
  },
  nav: {
    profile:    { label: "Hồ sơ",    icon: "person" },
    security:   { label: "Bảo mật",  icon: "lock" },
    appearance: { label: "Giao diện", icon: "palette" }
  },
  profile: {
    title: "Hồ sơ cá nhân",
    subtitle: "Thông tin cá nhân",
    fields: {
      fullName: "Họ và tên",
      studentId: "MSSV",
      email: "Email",
      bio: "Giới thiệu",
      bioPlaceholder: "Bạn đang học gì...",
      bioMaxChars: (n: number, max: number) => `${n}/${max}`
    },
    save: "Lưu thay đổi",
    saving: "Đang lưu...",
    success: "Đã lưu thay đổi"
  },
  security: {
    title: "Bảo mật tài khoản",
    subtitle: "Quản lý mật khẩu và xác thực",
    changePassword: {
      title: "Đổi mật khẩu",
      current: "Mật khẩu hiện tại",
      newPw: "Mật khẩu mới",
      confirm: "Xác nhận mật khẩu mới",
      submit: "Cập nhật mật khẩu",
      submitting: "Đang cập nhật...",
      success: "Mật khẩu đã cập nhật",
      errors: {
        mismatch: "Mật khẩu mới không khớp",
        tooShort: "Mật khẩu phải ít nhất 8 ký tự",
        wrongCurrent: "Mật khẩu hiện tại không đúng"
      }
    },
    strength: {
      weak:   "Yếu",
      medium: "Trung bình",
      fair:   "Khá",
      strong: "Mạnh"
    }
  },
  appearance: {
    title: "Giao diện",
    subtitle: "Chọn chế độ hiển thị phù hợp",
    light: { label: "Sáng", icon: "light_mode", id: "light" },
    dark:  { label: "Tối",  icon: "dark_mode",  id: "dark"  }
  },
  loading: {
    error: "Không thể tải thông tin. Vui lòng thử lại."
  }
};

export const MINDMAP_PAGE_TEXTS = {
  STATUS: {
    LOADING: "Đang tạo sơ đồ tư duy...",
    LOADING_SUBTITLE: "Đang phân tích nội dung tài liệu",
  },
  CONTROLS: {
    DOWNLOAD: "Tải ảnh sơ đồ",
    RESET_VIEW: "Căn giữa sơ đồ",
    UNDO: "Hoàn tác (Ctrl+Z)",
    REDO: "Làm lại (Ctrl+Y)",
    RESET_DIAGRAM: "Đặt lại toàn bộ sơ đồ",
    CODE_SIDEBAR: "Mã nguồn",
    COPY_CODE: "Sao chép mã",
  },
  GUIDE: {
    TITLE: "Thao tác",
    DESC: "Cầm kéo để di chuyển • Lăn chuột để thu phóng",
    MOBILE_DESC: "1 ngón kéo để di chuyển • Chụm 2 ngón để thu phóng",
  },
  EDITOR: {
    TITLE: "Điều chỉnh Sơ đồ",
    SUBTITLE: "Mermaid Mindmap Syntax",
    LABEL: "Mã nguồn (Mermaid)",
    PLACEHOLDER: "mindmap\n  root((Chủ đề))\n    Nhánh A\n    Nhánh B",
    APPLY: "Cập nhật",
    NOTE_TITLE: "Ghi chú",
    NOTE_DESC: "Chỉnh sửa mã và nhấn",
    NOTE_HIGHLIGHT: "\u201cCập nhật\u201d",
    NOTE_DESC2: "để áp dụng. Không thể hoàn tác sau khi áp dụng mã thủ công.",
  },
  RESET_CONFIRM: {
    TITLE: "Đặt lại sơ đồ tư duy",
    MESSAGE: "Toàn bộ sơ đồ hiện tại sẽ bị xóa và AI sẽ tạo lại từ đầu. Thao tác này không thể hoàn tác.",
    CONFIRM: "Đặt lại",
    CANCEL: "Giữ lại",
  },
};

