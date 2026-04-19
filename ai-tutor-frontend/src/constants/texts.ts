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

export const MINDMAP_PAGE_TEXTS = {
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
    REFRESH: "Làm mới sơ đồ từ AI"
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

