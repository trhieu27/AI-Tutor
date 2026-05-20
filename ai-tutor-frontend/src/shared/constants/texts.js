export const GLOBAL_METADATA_TEXTS = {
  title: "AI Tutor - Hệ thống học tập thông minh",
  description: "Phân tích, tóm tắt và thực hành trắc nghiệm dựa trên tài liệu của bạn với AI."
};
export const SIDEBAR_TEXTS = {
  brand: {
    title: "AI Tutor",
    subtitle: "Học trên tài liệu"
  },
  dashboard: "Tổng quan",
  learning: "Thư viện tài liệu",
  practice: "Luyện tập",
  mindmap: "Sơ đồ tư duy",
  uploadBtn: "Thêm tài liệu",
  settings: "Cài đặt",
  support: "Trợ giúp",
  upgrade: {
    header: "Nâng cấp Pro",
    title: "Nâng cấp Pro",
    desc: "Tăng hạn mức hỏi AI."
  }
};
export const HEADER_TEXTS = {
  searchPlaceholder: "Tìm kiếm tài liệu, bài giảng...",
  userName: "Trần Hiếu",
  proBadge: "Gói Pro",
  logout: "Đăng xuất",
  notifications: {
    title: "Thông báo",
    markAsRead: "Đã đọc",
    clearAll: "Xóa tất cả",
    empty: "Không có thông báo mới",
    viewAll: "Xem toàn bộ"
  },
  user: {
    defaultName: "Người dùng",
    notLoggedIn: "Chưa đăng nhập",
    idPrefix: "ID: "
  }
};

export const COMMON_ACTION_TEXTS = {
  confirm: "Xác nhận",
  cancel: "Hủy",
  close: "Đóng"
};

export const UPLOAD_AREA_TEXTS = {
  title: "Tải tài liệu lên",
  descriptionPrefix: "Kéo thả tài liệu vào đây hoặc",
  selectFileLink: "chọn tài liệu",
  maxSizeDesc: (mb = 50) => `Tối đa ${mb}MB`,
  acceptedTypes: "PDF, DOC, DOCX",
  status: {
    uploading: "Đang tải lên và xử lý...",
    success: "Tải lên thành công!",
    processingBg: "Hệ thống sẽ tự cập nhật trạng thái.",
    error: "Tải lên không thành công"
  }
};
export const DOCUMENT_TABLE_TEXTS = {
  title: "Thư viện tài liệu",
  colName: "Tên tài liệu",
  colDate: "Ngày tải lên",
  colStatus: "Trạng thái",
  colSize: "Dung lượng",
  colActions: "Thao tác",
  searchPlaceholder: "Tìm tên tài liệu, chủ đề...",
  retryBtn: "Thử lại",
  status: {
    processed: "Sẵn sàng",
    extracting: "AI đang phân tích...",
    uploading: "Đang tải lên...",
    failed: "Lỗi xử lý"
  },
  actions: {
    chat: "Hỏi AI",
    practice: "Trắc nghiệm",
    mindmap: "Sơ đồ tư duy"
  },
  deleteConfirm: {
    title: "Xóa tài liệu",
    cancel: "Giữ lại"
  },
  empty: {
    title: "Thư viện đang trống",
    subtitle: "Tải tài liệu đầu tiên để bắt đầu hỏi AI, tạo trắc nghiệm và sơ đồ tư duy.",
    hint: (mb = 50) => `Hỗ trợ định dạng PDF, DOC, DOCX tối đa ${mb}MB`
  }
};
export const AUTH_TEXTS = {
  COMMON: {
    networkError: "Không thể kết nối tới máy chủ.",
    hidePassword: "Ẩn mật khẩu",
    showPassword: "Hiện mật khẩu",
    lockoutFallback: (seconds) => `Thử quá nhiều lần. Thử lại sau ${seconds}s.`
  },
  LOGIN: {
    KICKER: "",
    HERO_TITLE: "AI Tutor",
    HERO_QUOTE: "Trợ lý học tập dựa trên tài liệu bạn tải lên",
    WELCOME_TITLE: "Chào mừng trở lại!",
    WELCOME_SUBTITLE: "",
    CONTINUE_WITH_GOOGLE: "Tiếp tục với Google",
    OR_LOGIN_WITH_EMAIL: "Hoặc đăng nhập với email",
    EMAIL_LABEL: "Email",
    EMAIL_PLACEHOLDER: "example@email.com",
    PASSWORD_LABEL: "Mật khẩu",
    FORGOT_PASSWORD: "Quên mật khẩu?",
    PASSWORD_PLACEHOLDER: "••••••••",
    LOGIN_BUTTON: "Đăng nhập",
    LOGIN_LOADING: "Đang xử lý...",
    LOGIN_ERROR: "Email hoặc mật khẩu không chính xác.",
    RATE_LIMIT_COUNTDOWN: seconds => `Thử quá nhiều lần. Vui lòng thử lại sau ${seconds} giây.`,
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
    SUCCESS_MSG: "Yêu cầu đã được gửi. Vui lòng kiểm tra email của bạn.",
    ERROR: "Email không hợp lệ hoặc không tồn tại.",
    OTP_TITLE: "Kiểm tra email",
    OTP_SUBTITLE: email => `Chúng tôi đã gửi mã xác nhận đến ${email}`,
    OTP_LABEL: "Mã xác nhận (6 chữ số)",
    VERIFY_OTP: "Xác thực mã",
    VERIFYING: "Đang xác thực...",
    RESET_TITLE: "Mật khẩu mới",
    RESET_SUBTITLE: "Hãy chọn một mật khẩu mạnh để bảo vệ tài khoản của bạn",
    NEW_PASSWORD: "Mật khẩu mới",
    CONFIRM_NEW_PASSWORD: "Xác nhận mật khẩu mới",
    RESET_BUTTON: "Cập nhật mật khẩu",
    RESET_LOADING: "Đang cập nhật...",
    SUCCESS_TITLE: "Cập nhật thành công",
    RESET_SUCCESS: "Đổi mật khẩu thành công. Vui lòng đăng nhập lại.",
    BACK_TO_LOGIN: "Quay lại đăng nhập"
  },
  REGISTER: {
    KICKER: "",
    PASSWORD_MISMATCH: "Mật khẩu xác nhận không khớp.",
    REGISTER_ERROR: "Đăng ký thất bại. Vui lòng thử lại.",
    VERIFY_ERROR: "Mã xác nhận không đúng.",
    WELCOME_TITLE: "Tạo tài khoản mới",
    WELCOME_SUBTITLE: "",
    CONTINUE_WITH_GOOGLE: "Đăng ký với Google",
    OR_REGISTER_WITH_EMAIL: "Hoặc đăng ký bằng email",
    NAME_LABEL: "Họ và tên",
    NAME_PLACEHOLDER: "Nguyễn Văn A",
    EMAIL_LABEL: "Email",
    EMAIL_PLACEHOLDER: "example@email.com",
    PASSWORD_LABEL: "Mật khẩu",
    PASSWORD_PLACEHOLDER: "Tối thiểu 8 ký tự",
    CONFIRM_PASSWORD_LABEL: "Xác nhận mật khẩu",
    CONFIRM_PASSWORD_PLACEHOLDER: "••••••••",
    REGISTER_BUTTON: "Đăng ký tài khoản",
    REGISTER_LOADING: "Đang tạo tài khoản...",
    HAVE_ACCOUNT: "Bạn đã có tài khoản?",
    LOGIN_NOW: "Đăng nhập ngay",
    VERIFY_TITLE: "Xác thực email",
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
    title: "Học trực tiếp trên tài liệu cùng AI Tutor",
    subtitle: "Tải tài liệu lên, hỏi AI, tóm tắt nội dung và luyện trắc nghiệm tại cùng một nơi."
  },
  features: {
    chat: {
      title: "Hỏi AI",
      desc: "Đặt câu hỏi dựa trên tài liệu đã chọn."
    },
    practice: {
      title: "Luyện trắc nghiệm",
      desc: "Tạo câu hỏi để kiểm tra mức độ hiểu bài."
    },
    summary: {
      title: "Tóm tắt tài liệu",
      desc: "Nắm nhanh ý chính và các phần quan trọng."
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
    tip: (mb = 50) => `Hỗ trợ PDF, DOC và DOCX tối đa ${mb}MB. AI sẽ tự động phân tích và cập nhật trạng thái xử lý.`
  }
};
export const LEARNING_PAGE_TEXTS = {
  header: {
    title: "Thư viện tài liệu",
    subtitle: "Quản lý tài liệu đã tải lên và bắt đầu hỏi AI, tóm tắt, trắc nghiệm hoặc sơ đồ tư duy."
  },
  cards: {
    query: {
      title: "Hỏi theo tài liệu",
      desc: "AI trả lời dựa trên nội dung tài liệu bạn chọn."
    },
    summary: {
      title: "Tóm tắt tài liệu",
      desc: "Rút gọn ý chính để ôn tập nhanh hơn."
    },
    quiz: {
      title: "Luyện trắc nghiệm",
      desc: "Tạo câu hỏi từ tài liệu để kiểm tra mức độ hiểu bài."
    }
  }
};
export const CHAT_TEXTS = {
  SIDEBAR: {
    TITLE: "Lịch sử",
    NEW_CHAT_TOOLTIP: "Cuộc trò chuyện mới",
    NO_SESSIONS: "Chưa có lịch sử nào cho tài liệu này."
  },
  HEADER: {
    AI_READY: "Sẵn sàng",
    LOADING_DOC: "Đang tải tài liệu...",
    ACTIONS: {
      SUMMARY: "Tóm tắt",
      QUIZ: "Luyện tập",
      MINDMAP: "Sơ đồ tư duy",
      MINDMAP_TOOLTIP: "Sơ đồ tư duy",
      QUESTIONS_TOOLTIP: "Câu hỏi ôn tập"
    }
  },
  WELCOME: {
    TITLE: "Bắt đầu hỏi AI",
    SUBTITLE: "Chọn một gợi ý hoặc nhập câu hỏi về tài liệu đang mở.",
    SUGGESTIONS: ["Nội dung chính của tài liệu này là gì?", "Liệt kê các khái niệm quan trọng nhất", "Giải thích các thuật ngữ chuyên ngành", "Mục đích cốt lõi của chương này"]
  },
  MESSAGES: {
    USER_LABEL: "Học sinh",
    AI_LABEL: "AI Tutor",
    AI_ANALYZING: "AI đang phân tích...",
    SOURCE_PAGE: "Trích dẫn trang",
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
      QUIZ: "Bài luyện trắc nghiệm"
    },
    LOADING: {
      SUMMARY: "AI đang tóm tắt tài liệu...",
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
    QUESTIONS_HINT: "Các câu hỏi dưới đây giúp bạn tự ôn lại nội dung tài liệu. Bạn có thể hỏi AI để được giải thích thêm.",
    ASK_AI_TOOLTIP: "Hỏi AI về câu này"
  }
};
export const MINDMAP_LIST_TEXTS = {
  title: "Sơ đồ tư duy",
  subtitle: "Chọn tài liệu để tạo sơ đồ tư duy từ nội dung đã xử lý.",
  heroTitle: "Vì sao nên dùng Sơ đồ tư duy?",
  heroDesc: "Sơ đồ tư duy giúp bạn nhìn nhanh chủ đề chính, ý phụ và quan hệ giữa các phần trong tài liệu.",
  EDITOR: {
    TITLE: "Công cụ sơ đồ tư duy",
    LABEL: "Trình chỉnh sửa",
    EDIT_BTN: "Chỉnh sửa nội dung",
    PLACEHOLDER: "Nhập mã Mermaid tại đây...",
    APPLY: "Cập nhật",
    CANCEL: "Hủy",
    TIPS_TITLE: "Mẹo sử dụng",
    TIPS_DESC: "Bạn có thể thêm nhánh mới bằng cách xuống dòng và thụt đầu dòng trong trình chỉnh sửa. Ví dụ:",
    EXAMPLE_NODE: "Nhánh mới",
    EXAMPLE_CHILD: "Ý con 1",
    PRINT: "Lưu sơ đồ/In"
  },
  CONTROLS: {
    OPEN_EDITOR: "Mở trình sửa",
    CLOSE_EDITOR: "Đóng trình sửa",
    ZOOM_IN: "Phóng to",
    ZOOM_OUT: "Thu nhỏ",
    RESET_ZOOM: "Đặt lại thu phóng",
    REFRESH: "Làm mới sơ đồ từ AI",
    CUSTOM: "Tùy chỉnh",
    CLOSE: "Đóng",
    DOWNLOAD: "Xuất tệp",
    RESET_VIEW: "Căn giữa sơ đồ"
  },
  GUIDE: {
    TITLE: "Thao tác",
    DESC: "Giữ chuột để kéo • Lăn chuột để thu phóng"
  },
  STATUS: {
    LOADING: "AI đang thiết kế sơ đồ...",
    DOC_LABEL: "Tài liệu:",
    FOOTER_TIP: "Mẹo: dùng con lăn chuột hoặc các phím (+) (-) để thu phóng sơ đồ."
  }
};
export const PRACTICE_PAGE_TEXTS = {
  title: "Luyện tập trắc nghiệm",
  subtitle: "Tạo bài trắc nghiệm từ tài liệu để kiểm tra mức độ hiểu bài.",
  cards: {
    activeLearning: {
      title: "Học tập chủ động",
      desc: "Thay vì chỉ đọc, hãy trả lời câu hỏi để kích hoạt bộ nhớ và hiểu sâu bản chất vấn đề."
    },
    expertExplanations: {
      title: "Giải thích chi tiết",
      desc: "Mỗi câu hỏi có giải thích để bạn hiểu vì sao đáp án đúng hoặc sai."
    }
  }
};
export const ERROR_MESSAGES = {
  GENERAL: "Hệ thống đang bận hoặc gặp lỗi xử lý. Vui lòng thử lại sau.",
  QUOTA_EXCEEDED: "Bạn đã hết lượt sử dụng AI miễn phí trong hôm nay. Vui lòng quay lại sau hoặc nâng cấp tài khoản.",
  MODEL_NOT_AVAILABLE: "Mô hình AI hiện đang được bảo trì hoặc không khả dụng. Vui lòng thử lại sau ít phút.",
  NETWORK_ERROR: "Lỗi kết nối máy chủ. Vui lòng kiểm tra lại đường truyền mạng của bạn.",
  CANCELLED: "Yêu cầu đã được hủy."
};
export const QUOTA_TEXTS = {
  exceeded: {
    title: "Đã hết lượt sử dụng",
    chat: "Bạn đã dùng hết lượt hỏi AI miễn phí hôm nay.",
    ai: "Bạn đã dùng hết lượt tạo nội dung AI miễn phí hôm nay.",
    desc: "Nâng cấp Pro để sử dụng không giới hạn hoặc quay lại vào ngày mai.",
    upgradeBtn: "Nâng cấp Pro",
    laterBtn: "Để sau"
  },
  upgrade: {
    navLabel: "Gói & Thanh toán",
    title: "Nâng cấp Pro",
    subtitle: "Tăng hạn mức hỏi AI, tạo nội dung và xử lý tài liệu.",
    currentPlanLabel: "Gói hiện tại của bạn",
    freePlan: "Miễn phí",
    proPlan: "Pro",
    upgradeBtn: "Nâng cấp",
    activating: "Đang xử lý...",
    successMsg: "Bạn đã nâng cấp thành công lên Pro.",
    featuresIntro: "Dùng thêm hạn mức và các quyền lợi của gói Pro.",
    proFeaturesIntro: "Bạn đang dùng gói Pro.",
    paymentTitle: "Thanh toán",
    paymentPrice: "₫99.000 VND/tháng (bao gồm VAT)",
    paymentPricePro: "₫99.000 VND/tháng",
    viewAllPlans: "Xem tất cả gói",
    proFeatures: [
      { icon: "hub", text: "Mô hình AI nâng cao" },
      { icon: "chat", text: "Hỏi AI không giới hạn" },
      { icon: "auto_awesome", text: "Tạo nội dung AI không giới hạn" },
      { icon: "upload_file", text: "Tải tài liệu không giới hạn" },
      { icon: "psychology", text: "Ưu tiên xử lý và phản hồi nhanh hơn" },
    ],
    freeFeatures: [
      { icon: "hub", text: "Mô hình AI cơ bản" },
      { icon: "chat", text: "30 tin nhắn mỗi ngày" },
      { icon: "auto_awesome", text: "10 lượt tạo nội dung AI/ngày" },
      { icon: "upload_file", text: "Không giới hạn tài liệu" },
      { icon: "psychology", text: "Xử lý thông thường" },
    ],
    currentPlan: "Gói hiện tại",
    proBadge: "Đang sử dụng",
    activateBtn: "Kích hoạt Pro",
    alreadyPro: "Bạn đang sử dụng gói Pro",
    features: [{
      icon: "chat",
      text: "Hỏi AI không giới hạn",
      free: "30 tin nhắn/ngày",
      pro: "Không giới hạn"
    }, {
      icon: "auto_awesome",
      text: "Tạo nội dung AI",
      free: "10 lượt/ngày",
      pro: "Không giới hạn"
    }, {
      icon: "upload_file",
      text: "Tài liệu",
      free: "Không giới hạn",
      pro: "Không giới hạn"
    }],
  }
};
export const QUIZ_PAGE_TEXTS = {
  header: {
    badge: "Kiểm tra trắc nghiệm",
    completed: "Đã hoàn thành",
    scoreBadge: (score, total) => `${score} / ${total} câu đúng`,
    retake: "Làm lại"
  },
  status: {
    loading: {
      title: "Đang chuẩn bị bài luyện tập...",
      desc: "AI đang tạo câu hỏi từ tài liệu của bạn."
    },
    error: {
      retry: "Vui lòng tạo lại hoặc quay về trang trước.",
      retryBtn: "Tạo lại",
      title: "Không thể tải bài luyện tập",
      back: "Quay lại"
    }
  },
  results: {
    title: "Kết quả luyện tập",
    expertExplanation: "Giải thích chi tiết",
    perfect: "Tuyệt vời! Bạn đã nắm vững kiến thức từ tài liệu này.",
    good: "Khá tốt! Bạn đã hiểu phần lớn nội dung quan trọng.",
    keepTrying: "Cần cố gắng thêm. Hãy xem lại phần giải thích để củng cố kiến thức.",
    correct: "Đúng",
    incorrect: "Sai"
  },
  question: (n) => `Câu ${n}:`,
  actions: {
    submit: "Nộp bài và xem đáp án",
    regenBtn: "Tạo lại",
    regenTooltip: "Tạo lại bài kiểm tra mới",
    confirmIncomplete: "Bạn chưa hoàn thành hết tất cả câu hỏi. Vẫn muốn nộp bài?"
  },
  confirm: {
    submitTitle: "Nộp bài chưa hoàn thành",
    submitMessage: (remaining) => `Bạn còn ${remaining} câu chưa trả lời. Bạn có chắc muốn nộp bài không?`,
    submitConfirm: "Nộp bài",
    submitCancel: "Tiếp tục làm",
    regenTitle: "Tạo lại bài luyện tập",
    regenMessage: "AI sẽ tạo một bộ câu hỏi mới hoàn toàn khác. Tiến trình làm bài hiện tại sẽ bị mất.",
    regenConfirm: "Tạo lại",
    regenCancel: "Giữ lại"
  }
};
export const HELP_PAGE_TEXTS = {
  hero: {
    badge: "Trung tâm hỗ trợ",
    title: "Cần hỗ trợ?",
    titleHighlight: "",
    subtitle: "Tìm hướng dẫn tải tài liệu, hỏi AI, tạo trắc nghiệm, sơ đồ tư duy và xử lý lỗi."
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
    items: [{
      question: "AI Tutor hoạt động như thế nào?",
      answer: "AI Tutor tìm các đoạn liên quan trong tài liệu bạn chọn, rồi dùng chúng làm căn cứ để trả lời. Sau khi tải lên, tài liệu có thể dùng để hỏi AI, tóm tắt, tạo trắc nghiệm và sơ đồ tư duy.",
      icon: "auto_awesome",
      category: "Tổng quan"
    }, {
      question: "Tôi có thể tải lên các định dạng tệp nào?",
      answer: "Hiện tại hệ thống hỗ trợ PDF, DOC và DOCX với dung lượng tối đa 50MB. Bạn chỉ cần kéo thả hoặc chọn tài liệu, AI sẽ tự động phân tích và cập nhật trạng thái trong Thư viện tài liệu.",
      icon: "upload_file",
      category: "Tài liệu"
    }, {
      question: "Làm thế nào để tạo Sơ đồ tư duy hiệu quả?",
      answer: "Sau khi tài liệu xử lý xong, hãy chọn Sơ đồ tư duy từ menu chính hoặc từ Thư viện tài liệu. Hệ thống sẽ lấy ý chính và sắp xếp thành sơ đồ. Bạn có thể chỉnh sửa, phóng to, thu nhỏ và xuất ảnh.",
      icon: "hub",
      category: "Tính năng"
    }, {
      question: "Bài kiểm tra trắc nghiệm được tạo ra như thế nào?",
      answer: "AI tạo câu hỏi trắc nghiệm từ nội dung tài liệu đã chọn. Mỗi câu có đáp án đúng và giải thích để bạn biết vì sao đáp án đó phù hợp.",
      icon: "assignment",
      category: "Tính năng"
    }, {
      question: "Tôi có thể sử dụng AI Tutor trên điện thoại không?",
      answer: "Có. Giao diện AI Tutor được thiết kế thích ứng tốt trên điện thoại, máy tính bảng và máy tính để bàn. Bạn chỉ cần truy cập thông qua trình duyệt web.",
      icon: "devices",
      category: "Tổng quan"
    }]
  },
  guide: {
    stepsLabel: "Các bước sử dụng",
    stepLabel: "Bước",
    prevButton: "Quay lại",
    nextButton: "Tiếp theo",
    steps: [{
      title: "Tải lên tài liệu",
      description: "Mở Thư viện tài liệu, kéo thả hoặc chọn PDF, DOC, DOCX. Hệ thống sẽ phân tích và cập nhật trạng thái xử lý.",
      icon: "cloud_upload",
      color: "from-[var(--brand-secondary)] to-[var(--brand-primary)]"
    }, {
      title: "Hỏi đáp với AI",
      description: "Vào Thư viện tài liệu, chọn tài liệu và bắt đầu đặt câu hỏi. AI sẽ trả lời dựa trên nội dung trong tài liệu đó.",
      icon: "forum",
      color: "from-[var(--brand-primary)] to-[var(--brand-secondary)]"
    }, {
      title: "Tóm tắt tài liệu",
      description: "Nhấn Tóm tắt trong Hỏi AI để lấy các ý chính của tài liệu.",
      icon: "summarize",
      color: "from-amber-500 to-orange-600"
    }, {
      title: "Luyện tập trắc nghiệm",
      description: "Mở Luyện tập, chọn tài liệu và tạo bài trắc nghiệm. Sau khi trả lời, bạn có thể xem giải thích từng câu.",
      icon: "quiz",
      color: "from-rose-500 to-pink-600"
    }, {
      title: "Tạo sơ đồ tư duy",
      description: "Mở Sơ đồ tư duy, chọn tài liệu và xem cấu trúc nội dung. Bạn có thể chỉnh sửa và xuất ảnh.",
      icon: "hub",
      color: "from-emerald-500 to-teal-600"
    }, {
      title: "Câu hỏi ôn tập",
      description: "Tạo câu hỏi mở để tự kiểm tra kiến thức trước khi ôn tập sâu hơn.",
      icon: "psychology",
      color: "from-cyan-500 to-blue-600"
    }]
  },
  contact: {
    formTitle: "Gửi yêu cầu hỗ trợ",
    formSubtitle: "Mô tả vấn đề bạn gặp phải, chúng tôi sẽ phản hồi qua email.",
    subjectLabel: "Tiêu đề",
    subjectPlaceholder: "Ví dụ khi tải lên tài liệu PDF",
    messageLabel: "Nội dung chi tiết",
    messagePlaceholder: "Mô tả chi tiết vấn đề bạn đang gặp phải...",
    charCount: "ký tự",
    submitButton: "Gửi yêu cầu hỗ trợ",
    successToast: "Yêu cầu hỗ trợ đã được gửi. Chúng tôi sẽ phản hồi trong 24 giờ.",
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
    profile: {
      label: "Hồ sơ",
      icon: "person"
    },
    security: {
      label: "Bảo mật",
      icon: "lock"
    },
    appearance: {
      label: "Giao diện",
      icon: "palette"
    }
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
      bioMaxChars: (n, max) => `${n}/${max}`
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
      weak: "Yếu",
      medium: "Trung bình",
      fair: "Khá",
      strong: "Mạnh"
    }
  },
  appearance: {
    title: "Giao diện",
    subtitle: "Chọn chế độ sáng hoặc tối",
    light: {
      label: "Sáng",
      icon: "light_mode",
      id: "light"
    },
    dark: {
      label: "Tối",
      icon: "dark_mode",
      id: "dark"
    }
  },
  loading: {
    error: "Không thể tải thông tin. Vui lòng thử lại."
  }
};
export const MINDMAP_PAGE_TEXTS = {
  STATUS: {
    LOADING: "Đang tạo sơ đồ tư duy...",
    LOADING_SUBTITLE: "Đang phân tích nội dung tài liệu"
  },
  CONTROLS: {
    DOWNLOAD: "Tải ảnh sơ đồ",
    RESET_VIEW: "Căn giữa sơ đồ",
    UNDO: "Hoàn tác (Ctrl+Z)",
    REDO: "Làm lại (Ctrl+Y)",
    RESET_DIAGRAM: "Đặt lại toàn bộ sơ đồ",
    CODE_SIDEBAR: "Mã Mermaid",
    COPY_CODE: "Sao chép mã"
  },
  GUIDE: {
    TITLE: "Thao tác",
    DESC: "Giữ chuột để kéo • Lăn chuột để thu phóng",
    MOBILE_DESC: "1 ngón kéo để di chuyển • Chụm 2 ngón để thu phóng"
  },
  EDITOR: {
    TITLE: "Chỉnh sửa sơ đồ",
    SUBTITLE: "Cú pháp Mermaid cho sơ đồ tư duy",
    LABEL: "Mã Mermaid",
    PLACEHOLDER: "mindmap\n  root((Chủ đề))\n    Nhánh A\n    Nhánh B",
    APPLY: "Cập nhật",
    NOTE_TITLE: "Ghi chú",
    NOTE_DESC: "Chỉnh sửa mã và nhấn",
    NOTE_HIGHLIGHT: "\u201cCập nhật\u201d",
    NOTE_DESC2: "để áp dụng. Không thể hoàn tác sau khi áp dụng mã thủ công."
  },
  RESET_CONFIRM: {
    TITLE: "Đặt lại sơ đồ tư duy",
    MESSAGE: "Toàn bộ sơ đồ hiện tại sẽ bị xóa và AI sẽ tạo lại từ đầu. Thao tác này không thể hoàn tác.",
    CONFIRM: "Đặt lại",
    CANCEL: "Giữ lại"
  }
};
export const PRICING_PAGE_TEXTS = {
  hero: {
    badge: 'Bảng giá',
    title: 'Chọn gói phù hợp với bạn',
    subtitle: 'Mở khóa nhiều lượt AI hơn, xử lý ưu tiên và giữ nhịp học không bị ngắt quãng.',
  },
  toggle: {
    title: 'Chu kỳ thanh toán',
    monthlyNote: 'Thanh toán từng tháng',
    annualNote: 'Thanh toán theo năm, tiết kiệm hơn',
    monthly: 'Hàng tháng',
    annual: 'Hàng năm',
    saveBadge: 'Tiết kiệm 40%',
    saveShort: '40%',
  },
  plans: {
    free: {
      name: 'Miễn phí',
      cta: 'Dùng miễn phí',
      ctaActive: 'Gói hiện tại',
    },
    pro_monthly: {
      name: 'Pro',
      cta: 'Đăng ký ngay',
      ctaActive: 'Gói hiện tại',
      popularBadge: 'Phổ biến nhất',
    },
    pro_annual: {
      name: 'Pro hằng năm',
      cta: 'Đăng ký tiết kiệm',
      ctaActive: 'Gói hiện tại',
    },
  },
  price: {
    zeroDong: '0đ',
    dongSuffix: 'đ',
    freeAmount: '₫0',
    vndPerMonth: 'VND /tháng',
    vndByCycle: (cycle) => `VND/${cycle === "annual" ? "năm" : "tháng"}`,
    free: 'Miễn phí',
    perMonth: '/tháng',
    perYear: '/năm',
    billedAnnually: 'Thanh toán hàng năm',
    billedMonthly: 'Thanh toán hàng tháng',
    originalPrice: 'Giá gốc',
    savePercent: (n) => `Tiết kiệm ${n}%`,
  },
  features: {
    sectionTitle: 'So sánh tính năng',
    included: 'Có',
    notIncluded: 'Không có',
  },
  // Payment modal
  payment: {
    title: 'Hoàn tất đăng ký',
    subtitle: (planName) => `Bạn đang đăng ký gói ${planName}`,
    orderSummary: 'Tóm tắt đơn hàng',
    plan: 'Gói',
    billingCycle: 'Chu kỳ',
    total: 'Tổng thanh toán',
    monthly: 'Hàng tháng',
    annual: 'Hàng năm',
    method: {
      title: 'Phương thức thanh toán',
      momo: 'Ví MoMo',
      vnpay: 'VNPay QR',
      credit_card: 'Thẻ tín dụng / ghi nợ',
    },
    creditCard: {
      number: 'Số thẻ',
      numberPlaceholder: '1234 5678 9012 3456',
      expiry: 'Ngày hết hạn',
      expiryPlaceholder: 'MM/YY',
      cvv: 'CVV',
      cvvPlaceholder: '•••',
      holder: 'Tên chủ thẻ',
      holderPlaceholder: 'NGUYEN VAN A',
    },
    submitBtn: 'Xác nhận thanh toán',
    submitting: 'Đang xử lý...',
    cancelBtn: 'Hủy',
    close: 'Đóng',
    successTitle: 'Thanh toán thành công',
    successMsg: (planName) => `Bạn đã nâng cấp lên ${planName}. Gói mới đã sẵn sàng để sử dụng.`,
    successBtn: 'Bắt đầu học ngay',
    errors: {
      selectMethod: 'Vui lòng chọn phương thức thanh toán',
      fillCard: 'Vui lòng điền đầy đủ thông tin thẻ',
    },
    secureNote: 'Thông tin thanh toán được mã hóa và bảo mật.',

  },
  planFallbacks: {
    taglineFree: 'Khởi động nhẹ nhàng',
    taglineAnnual: 'Tối ưu cho học dài hạn',
    taglineMonthly: 'Cho nhịp học hằng tháng',
    popular: 'Phổ biến',
    currentPlan: 'Gói hiện tại',
    freeCta: 'Dùng miễn phí',
    proCta: 'Đăng ký ngay',
    hiddenFeatureKeywords: ['hỗ trợ', 'lịch sử', 'ưu tiên']
  },
  empty: {
    noPlans: 'Không có gói nào khả dụng.'
  },
  faq: {
    title: 'Câu hỏi thường gặp',
    items: [
      {
        q: 'Tôi có thể hủy bất cứ lúc nào không?',
        a: 'Có, bạn có thể hủy gói Pro bất cứ lúc nào. Sau khi hủy, bạn vẫn được dùng tính năng Pro đến hết chu kỳ thanh toán hiện tại.',
      },
      {
        q: 'Có thể nâng cấp từ tháng lên năm không?',
        a: 'Có. Bạn chọn gói Pro hằng năm và xác nhận thanh toán. Phần còn lại của chu kỳ tháng sẽ được tính vào khoản thanh toán mới.',
      },
      {
        q: '"Không giới hạn" có nghĩa là gì?',
        a: 'Không giới hạn số lượt hỏi AI, tạo nội dung AI, sơ đồ tư duy và bài kiểm tra trong một ngày. Bạn học đến đâu, AI hỗ trợ đến đó.',
      },
      {
        q: 'Phương thức thanh toán nào được hỗ trợ?',
        a: 'Hiện tại chúng tôi hỗ trợ Ví MoMo, VNPay QR và thẻ tín dụng/ghi nợ quốc tế (Visa, Mastercard, JCB).',
      },
    ],
  },
};

export const INTERACTIVE_MINDMAP_TEXTS = {
  building: "Đang dựng sơ đồ...",
  backBtn: "Quay lại",
  rootNode: "Chủ đề chính",
  newNode: "Nhánh mới",
  nodeEditor: {
    title: "Chỉnh sửa nội dung",
    placeholder: "Nhập nội dung…",
    save: "Lưu thay đổi",
    cancel: "Hủy"
  },
  colorPicker: {
    title: "Màu nhánh"
  },
  contextMenu: {
    editContent: "Sửa nội dung",
    addChild: "Thêm nhánh con",
    changeColor: "Đổi màu",
    deleteBranch: "Xóa nhánh"
  }
};

export const NOTIFICATION_TOAST_TEXTS = {
  close: "Đóng",
  notifications: "Thông báo"
};

export const THEME_TOGGLE_TEXTS = {
  ariaLabel: "Đổi giao diện",
  toLight: "Chuyển sang sáng",
  toDark: "Chuyển sang tối"
};

export const PREMIUM_COMPONENT_TEXTS = {
  featureAction: "Mở ngay"
};

export const UI_STATE_TEXTS = {
  loading: {
    title: "Đang tải..."
  },
  error: {
    title: "Không thể tải dữ liệu",
    subtitle: "Vui lòng thử lại sau."
  }
};

export const STATUS_BADGE_TEXTS = {
  ready: "Sẵn sàng",
  processing: "Đang xử lý",
  uploading: "Đang tải",
  failed: "Thất bại"
};

export const AUTH_BRANDING_TEXTS = {
  headline: "Học nhanh hơn với AI bám sát tài liệu của bạn",
  pipelineLabel: "quy trình học",
  liveLabel: "đang xử lý",
  footerTitle: "Bảng điều khiển học tập AI Tutor",
  footerMeta: "nhanh / rõ / có căn cứ",
  activityRows: [
    { id: "01", title: "Phân tích giáo trình", meta: "42 trang", tone: "var(--brand-primary)" },
    { id: "02", title: "Tạo trắc nghiệm ôn tập", meta: "18 câu", tone: "var(--brand-warm)" },
    { id: "03", title: "Sơ đồ tư duy", meta: "7 nhánh", tone: "var(--brand-secondary)" }
  ]
};

export const FORGOT_PASSWORD_FLOW_TEXTS = {
  errors: {
    waitBeforeResend: (seconds) => `Vui lòng đợi ${seconds} giây trước khi yêu cầu mã mới.`,
    emailNotFound: "Email không tồn tại trong hệ thống.",
    otpIncomplete: "Vui lòng nhập đủ 6 chữ số mã OTP.",
    otpWrong: (remaining) => `Mã xác nhận sai. Bạn còn ${remaining} lần thử.`,
    passwordMismatch: "Xác nhận mật khẩu không khớp.",
    passwordTooShort: "Mật khẩu phải có tối thiểu 8 ký tự.",
    resetFailed: "Không thể đổi mật khẩu.",
    otpLockout: (seconds) => `Thử quá nhiều lần. Vui lòng thử lại sau ${seconds} giây.`
  },
  header: {
    email: {
      title: "Quên mật khẩu?",
      subtitle: "",
      tag: ""
    },
    otp: {
      title: "Xác thực mã",
      subtitle: () => "",
      tag: ""
    },
    reset: {
      title: "Mật khẩu mới",
      subtitle: "",
      tag: ""
    },
    success: { title: "", subtitle: "", tag: "" }
  },
  emailLabel: "Email khôi phục",
  emailPlaceholder: "example@email.com",
  processing: "Đang xử lý...",
  retryAfter: (seconds) => `Thử lại sau ${seconds}s`,
  continue: "Tiếp tục",
  checking: "Đang kiểm tra...",
  locked: "Đang bị khóa",
  verifyOtp: "Xác thực mã OTP",
  noCode: "Bạn không nhận được mã?",
  resendNow: "Gửi lại ngay",
  passwordFields: [
    { key: "new", placeholder: "Mật khẩu mới (tối thiểu 8 ký tự)" },
    { key: "confirm", placeholder: "Xác nhận lại mật khẩu mới" }
  ],
  hidePassword: "Ẩn mật khẩu",
  showPassword: "Hiện mật khẩu",
  updating: "Đang cập nhật...",
  updatePassword: "Cập nhật mật khẩu",
  successTitle: "Cập nhật thành công",
  successSubtitle: "Mật khẩu của bạn đã được thay đổi. Hãy đăng nhập lại để tiếp tục học tập.",
  loginNow: "Đăng nhập ngay",
  back: "Quay lại",
  return: "Trở lại"
};

export const APP_SHELL_TEXTS = {
  nav: [
    { href: "/", icon: "space_dashboard", label: "Tổng quan", exact: true },
    { href: "/learning", icon: "library_books", label: "Thư viện tài liệu" },
    { href: "/chat", icon: "forum", label: "Hỏi AI" },
    { href: "/practice", icon: "quiz", label: "Luyện tập" },
    { href: "/mindmap", icon: "account_tree", label: "Sơ đồ tư duy" },
  ],
  bottomNav: [
    { href: "/settings", icon: "settings", label: "Cài đặt" },
    { href: "/help", icon: "support_agent", label: "Trợ giúp" }
  ],
  sidebar: {
    brandSubtitle: "Học với tài liệu",
    workspaceLabel: "Menu",
    studySessionsLabel: "Lịch sử",
    closeMenu: "Đóng menu",
    closeNavigation: "Đóng menu điều hướng",
    mainNavAria: "Điều hướng chính",
    fallbackStudent: "Người dùng",
    fallbackSessionTitle: "Cuộc trò chuyện",
    fallbackDocumentName: "Tài liệu",
    emptySessions: "Chưa có lịch sử.",
    proWorkspace: "Gói Pro",
    freeWorkspace: "Gói miễn phí",
    upgradeTitle: "Nâng cấp Pro",
    upgradeSubtitle: "mở thêm lượt dùng AI"
  },
  header: {
    menuAria: "Menu",
    readyStatus: "Sẵn sàng",
    notificationFallbackTitle: "Thông báo",
    notificationEmpty: "Chưa có thông báo",
    clearAllNotifications: "Xóa tất cả",
    proBadge: "Pro",
    freeBadge: "Miễn phí",
    timeAgoNow: "Vừa xong",
    timeAgoMinute: (count) => `${count} phút trước`,
    timeAgoHour: (count) => `${count} giờ trước`,
    timeAgoDay: (count) => `${count} ngày trước`
  }
};

export const DOCUMENT_COPY = {
  fallbackName: "Tài liệu chưa đặt tên",
  fallbackExtension: "DOC",
  fallbackDate: "Chưa có ngày",
  fallbackSize: "Chưa rõ dung lượng",
  pages: (count) => `${count} trang`,
  pagesUpdating: "Đang cập nhật số trang"
};

export const DOCUMENT_LIBRARY_TEXTS = {
  statusOptions: [
    { id: "all", label: "Tất cả", icon: "select_all" },
    { id: "ready", label: "Sẵn sàng", icon: "task_alt" },
    { id: "processing", label: "Đang xử lý", icon: "progress_activity" },
    { id: "failed", label: "Thất bại", icon: "error" }
  ],
  sortOptions: [
    { id: "recent", label: "Mới cập nhật" },
    { id: "name", label: "Tên tài liệu" },
    { id: "type", label: "Loại tệp" },
    { id: "status", label: "Trạng thái" }
  ],
  waiting: "Chưa sẵn sàng",
  actions: {
    chat: "Hỏi AI",
    summary: "Tóm tắt",
    quiz: "Trắc nghiệm",
    mindmap: "Sơ đồ tư duy",
    delete: "Xóa",
    retry: "Thử lại",
    refresh: "Làm mới"
  },
  stats: {
    total: (count) => `${count} tài liệu`,
    ready: (count) => `${count} sẵn sàng`,
    processing: (count) => `${count} đang xử lý`,
    failed: (count) => `${count} lỗi xử lý`
  },
  metadataColumn: "Thông tin",
  sortAria: "Sắp xếp tài liệu",
  pagination: {
    range: (start, end, total) => `${start}-${end} / ${total}`,
    page: (page, total) => `Trang ${page}/${total}`,
    perPageLabel: "Hiển thị",
    perPageOption: (count) => `${count}/trang`,
    pageButton: (page) => `Trang ${page}`,
    previous: "Trang trước",
    next: "Trang sau"
  },
  emptyFilteredTitle: "Không tìm thấy tài liệu",
  emptyFilteredSubtitle: "Thử từ khóa khác hoặc đổi bộ lọc trạng thái.",
  deleteConfirm: {
    confirm: "Xóa",
    message: (fileName = "") => `Bạn có chắc muốn xóa "${fileName}"? Thao tác này không thể hoàn tác.`
  },
  alerts: {
    deleteFailed: "Xóa tài liệu thất bại.",
    retryFailed: "Thử lại thất bại"
  }
};

export const UPLOAD_DROPZONE_TEXTS = {
  invalidType: "Chỉ chấp nhận định dạng PDF, DOC hoặc DOCX.",
  uploadingQueue: "Tài liệu trong hàng đợi",
  dropHint: "Kéo thả PDF/DOC/DOCX hoặc nhấn để chọn tài liệu.",
  badges: () => ["PDF", "DOC", "DOCX", "25MB"],
  removeFromQueue: "Xóa khỏi hàng đợi"
};

export const DOCUMENT_PICKER_TEXTS = {
  defaults: {
    title: "Chọn tài liệu",
    subtitle: "Chọn tài liệu đã xử lý xong để bắt đầu.",
    actionLabel: "Bắt đầu"
  },
  loading: {
    title: "Đang tải tài liệu",
    subtitle: "Đang kiểm tra trạng thái tài liệu."
  },
  searchPlaceholder: "Tìm tài liệu...",
  count: (count) => `${count} tài liệu`,
  pagination: {
    range: (start, end, total) => `${start}-${end} / ${total}`,
    page: (page, total) => `Trang ${page}/${total}`,
    perPageLabel: "Hiển thị",
    perPageOption: (count) => `${count}/trang`,
    pageButton: (page) => `Trang ${page}`,
    previous: "Trang trước",
    next: "Trang sau"
  },
  empty: {
    filteredTitle: "Không tìm thấy tài liệu phù hợp",
    readyTitle: "Chưa có tài liệu sẵn sàng",
    filteredSubtitle: "Thử từ khóa khác hoặc mở Thư viện tài liệu.",
    readySubtitle: "Hãy tải lên PDF, DOC hoặc DOCX trước. Tài liệu đang xử lý sẽ nằm trong Thư viện tài liệu.",
    uploadFirst: "Tải tài liệu đầu tiên"
  },
  selectedSource: "Tài liệu đã chọn",
  selected: "Đã chọn",
  chooseSource: "Chọn tài liệu"
};

export const DASHBOARD_WORKSPACE_TEXTS = {
  hero: {
    title: "Không gian học tập",
    subtitle: "Tổng hợp tiến độ, tài liệu gần đây và truy cập nhanh các tính năng",
    continue: "Tiếp tục học",
    upload: "Tải tài liệu",
    openLibrary: "Mở thư viện"
  },
  context: {
    title: "Tài liệu đang học",
    subtitle: "",
    chat: "Hỏi AI",
    recentSession: "Lần hỏi AI gần nhất",
    documentConversation: "Hỏi đáp theo tài liệu",
    readyMeta: (pages) => `Sẵn sàng · ${pages}`,
    loadingTitle: "Đang kiểm tra tài liệu",
    loadingSubtitle: "Đang tìm tài liệu đã sẵn sàng.",
    emptyTitle: "Chưa có tài liệu đang học",
    emptySubtitle: "Tải lên PDF, DOC hoặc DOCX để bắt đầu hỏi đáp, luyện tập và tạo sơ đồ dựa trên tài liệu."
  },
  stats: {
    ready: { label: "Tài liệu sẵn sàng", helper: "Có thể bắt đầu học ngay" },
    processing: { label: "Đang xử lý", helper: "Theo dõi tài liệu đang phân tích" },
    sessions: { label: "Lịch sử", helper: "Các phiên hỏi đáp đã lưu" },
    pages: { label: "Tổng số trang", helper: "Tổng trang trong thư viện", failedHelper: (count) => `${count} tài liệu lỗi xử lý` }
  },
  actions: {
    title: "Chọn bước học tiếp theo",
    subtitle: "Tiếp tục từ tài liệu gần đây hoặc bắt đầu một phiên học mới",
    upload: "Tải tài liệu",
    chat: "Tiếp tục hỏi AI",
    quiz: "Tạo trắc nghiệm",
    mindmap: "Tạo sơ đồ tư duy"
  },
  recentDocuments: {
    title: "Tài liệu gần đây",
    subtitle: "",
    viewAll: "Xem tất cả",
    emptyTitle: "Chưa có tài liệu",
    emptySubtitle: "Tài liệu mới tải lên sẽ xuất hiện ở đây."
  }
};

export const DOCUMENT_LIBRARY_PAGE_TEXTS = {
  header: {
    title: "Tài liệu của bạn",
    subtitle: "Tải lên, tìm kiếm và quản lý tất cả tài liệu học tập",
    chat: "Hỏi AI",
    upload: "Tải tài liệu"
  },
  upload: {
    title: "Tải tài liệu lên",
    subtitle: (mb = 50) => `PDF, DOC, DOCX. Tối đa ${mb}MB.`,
    badge: ""
  }
};

export const CHAT_START_PAGE_TEXTS = {
  header: {
    title: "Trò chuyện cùng AI",
    subtitle: "Chọn tài liệu và đặt câu hỏi, AI sẽ trả lời dựa trên nội dung",
    library: "Thư viện tài liệu",
    uploadFirst: "Tải tài liệu"
  },
  picker: {
    title: "Chọn tài liệu để hỏi AI",
    subtitle: "",
    actionLabel: "Bắt đầu hỏi AI"
  },
  cards: [
    { icon: "summarize", title: "Tóm tắt", desc: "Rút ra luận điểm chính và các phần quan trọng" },
    { icon: "psychology", title: "Giải thích đơn giản", desc: "Yêu cầu AI diễn giải khái niệm khó bằng ngôn ngữ dễ hiểu" },
    { icon: "quiz", title: "Luyện tập", desc: "Biến tài liệu thành một bài trắc nghiệm tập trung" }
  ]
};

export const PRACTICE_WORKSPACE_TEXTS = {
  header: {
    title: "Kiểm tra kiến thức",
    subtitle: "Chọn tài liệu để tạo bộ câu hỏi trắc nghiệm từ nội dung đã học",
    library: "Thư viện tài liệu",
    upload: "Tải tài liệu"
  },
  picker: {
    title: "Chọn tài liệu tạo trắc nghiệm",
    subtitle: "AI Tutor sẽ tạo bộ câu hỏi trắc nghiệm từ tài liệu đã chọn",
    actionLabel: "Tạo trắc nghiệm"
  },
  cards: [
    { icon: "looks_one", title: "Từng câu một", desc: "Tập trung vào một câu hỏi trước khi xem giải thích" },
    { icon: "lightbulb", title: "Học từ phản hồi", desc: "Trạng thái đúng/sai giúp bạn ôn lại nhanh hơn" },
    { icon: "forum", title: "Hỏi AI thêm", desc: "Yêu cầu AI giải thích điểm yếu từ cùng tài liệu" },
    { icon: "replay", title: "Làm lại nhanh", desc: "Ôn lại câu sai hoặc tạo bài mới khi cần" }
  ]
};

export const MINDMAP_WORKSPACE_TEXTS = {
  header: {
    title: "Hệ thống hóa kiến thức",
    subtitle: "Chọn tài liệu để tạo sơ đồ cấu trúc nội dung, chỉnh sửa và xuất ảnh",
    library: "Thư viện tài liệu",
    upload: "Tải tài liệu"
  },
  picker: {
    title: "Chọn tài liệu tạo sơ đồ tư duy",
    subtitle: "Mỗi sơ đồ được tạo từ một tài liệu đã xử lý xong",
    actionLabel: "Tạo sơ đồ"
  },
  cards: [
    { icon: "hub", title: "Tách ý chính", desc: "Nhìn nhanh chủ đề lớn và các ý hỗ trợ" },
    { icon: "open_with", title: "Điều khiển sơ đồ", desc: "Kéo, phóng to, căn giữa và quan sát quan hệ khi học" },
    { icon: "edit_note", title: "Có thể chỉnh sửa", desc: "Sửa cấu trúc Mermaid để bản ôn tập gọn hơn" },
    { icon: "download", title: "Xuất ảnh", desc: "Lưu sơ đồ để ôn lại hoặc chia sẻ" }
  ],
  canvas: {
    regenerate: "Tạo lại",
    errorTitle: "Không thể tải sơ đồ tư duy",
    errorMessage: "Không thể tạo sơ đồ tư duy. Vui lòng thử lại.",
    retry: "Thử lại",
    back: "Quay lại",
    guideTitle: "Thao tác",
    noteTitle: "Ghi chú",
    noteBodyPrefix: "Chỉnh sửa mã và nhấn ",
    noteBodySuffix: " để áp dụng. Không thể hoàn tác sau khi áp dụng mã thủ công."
  }
};

export const CHAT_WORKSPACE_TEXTS = {
  quickActions: [
    { id: "summary", icon: "summarize", label: "Tóm tắt tài liệu" },
    { id: "explain", icon: "psychology", label: "Giải thích dễ hiểu" },
    { id: "quiz", icon: "quiz", label: "Tạo câu hỏi trắc nghiệm" },
    { id: "mindmap", icon: "account_tree", label: "Tạo sơ đồ" },
    { id: "questions", icon: "help", label: "Tạo câu hỏi ôn tập" }
  ],
  composer: {
    label: "Tin nhắn hỏi AI",
    placeholder: "Hỏi bất cứ điều gì về tài liệu đã chọn...",
    disclaimer: "Câu trả lời dựa trên tài liệu đã chọn. Hãy kiểm chứng các chi tiết quan trọng.",
    stop: "Dừng",
    send: "Gửi"
  },
  threads: {
    title: "Lịch sử",
    subtitle: "",
    newSession: "Đoạn chat mới",
    searchPlaceholder: "Tìm cuộc trò chuyện...",
    loading: "Đang tải lịch sử...",
    empty: "Chưa có cuộc trò chuyện nào. Đặt câu hỏi đầu tiên để bắt đầu.",
    fallbackTitle: "Cuộc trò chuyện chưa đặt tên",
    messageCount: (count) => `${count} tin nhắn`,
    deleteSession: "Xóa cuộc trò chuyện"
  },
  contextPanel: {
    selectedSource: "Tài liệu đang mở",
    loadingDocument: "Đang tải tài liệu...",
    switchSource: "Đổi tài liệu",
    library: "Thư viện",
    quickActions: "Hành động nhanh",
    citations: "Trích dẫn",
    citationsEmpty: "Các đoạn trích dẫn từ tài liệu sẽ xuất hiện sau khi AI trả lời.",
    usage: "Mức sử dụng",
    chatMessages: "Tin nhắn",
    aiGenerations: "Lượt tạo nội dung",
    remaining: (count) => `Còn ${count ?? "—"}`
  },
  sources: {
    title: "Trích dẫn",
    fallback: (index) => `Trích dẫn ${index + 1}`,
    page: (page) => `tr. ${page}`,
    openPdf: "Mở trong PDF",
    pdfTitle: "Tài liệu gốc",
    pdfLoading: "Đang mở PDF",
    pdfError: "Không thể mở PDF cho trích dẫn này",
    previousPage: "Trang trước",
    nextPage: "Trang sau",
    zoomIn: "Phóng to",
    zoomOut: "Thu nhỏ"
  },
  messageActions: {
    copy: "Sao chép",
    retry: "Thử lại"
  },
  modal: {
    summaryTitle: "Tóm tắt tài liệu",
    questionsTitle: "Câu hỏi ôn tập",
    close: "Đóng",
    downloadShort: "Tải xuống",
    downloadSummary: "Tải xuống bản tóm tắt",
    summaryLoading: "Đang viết tóm tắt",
    questionsLoading: "Đang tạo câu hỏi",
    loadingSubtitle: "Tính năng này dùng tài liệu đang mở.",
    noSummary: "Chưa có tóm tắt được trả về.",
    askAI: "Hỏi AI về câu này",
    noQuestionsTitle: "Chưa có câu hỏi",
    noQuestionsSubtitle: "Hãy thử hỏi trực tiếp trong Hỏi AI hoặc tạo lại sau."
  },
  quota: {
    title: "Đã hết lượt sử dụng",
    chat: "Bạn đã dùng hết lượt hỏi AI hiện có.",
    ai: "Bạn đã dùng hết lượt tạo nội dung AI hiện có.",
    viewPlan: "Xem gói",
    later: "Để sau"
  },
  page: {
    fallbackSessionTitle: "Cuộc trò chuyện",
    loadError: "Không thể mở Hỏi AI cho tài liệu này.",
    explainPrompt: "Hãy giải thích khái niệm khó nhất trong tài liệu này bằng ngôn ngữ dễ hiểu.",
    summaryError: "_Không thể hoàn tất phần tóm tắt._",
    initialExplainPrompt: "Hãy giải thích những phần mình làm sai trong kết quả trắc nghiệm.",
    askStudyQuestion: (question) => `Hãy giải thích câu hỏi ôn tập này và gợi ý cách trả lời:\n\n${question}`,
    assistantPending: "",
    assistantError: "AI Tutor chưa thể trả lời lúc này.",
    deleteConfirm: "Xóa cuộc trò chuyện này?",
    loadingTitle: "Đang mở Hỏi AI",
    loadingSubtitle: "Đang tải lịch sử và tài liệu.",
    errorSubtitle: "Hãy quay lại Thư viện tài liệu và chọn tài liệu sẵn sàng khác.",
    openLibrary: "Mở thư viện",
    openHistory: "Mở lịch sử",
    titleFallback: "Hỏi AI",
    openContext: "Mở tài liệu",
    emptyTitle: "Hỏi bất cứ điều gì về tài liệu đã chọn",
    emptySubtitle: "Bắt đầu bằng một câu hỏi, yêu cầu tóm tắt hoặc gợi ý ôn tập. AI Tutor sẽ bám theo tài liệu đang mở.",
    emptySummaryAction: "Tóm tắt tài liệu này",
    chooseDocument: "Chọn tài liệu",
    assistantTyping: "AI Tutor đang soạn câu trả lời",
    closeHistory: "Đóng lịch sử",
    closeContext: "Đóng tài liệu"
  }
};

export const QUIZ_WORKSPACE_TEXTS = {
  errors: {
    cannotGenerate: "Không thể tạo bộ câu hỏi trắc nghiệm cho tài liệu này.",
    loadFailed: "Đã xảy ra lỗi khi tải bài kiểm tra."
  },
  loading: {
    title: "Đang chuẩn bị bài luyện tập",
    subtitle: "AI đang tạo bộ câu hỏi trắc nghiệm từ tài liệu đã chọn."
  },
  quota: {
    title: "Đã hết lượt sử dụng",
    subtitle: "Bạn đã dùng hết lượt tạo nội dung AI hiện có.",
    action: "Xem gói"
  },
  errorState: {
    subtitle: "Hãy thử tạo lại hoặc chọn tài liệu khác trong Luyện tập.",
    regenerate: "Tạo lại",
    back: "Quay lại Luyện tập"
  },
  empty: {
    title: "Chưa có câu hỏi trắc nghiệm",
    subtitle: "Tài liệu chưa trả về bộ trắc nghiệm có thể sử dụng.",
    action: "Chọn tài liệu khác"
  },
  header: {
    kicker: "Luyện tập trắc nghiệm",
    title: "Bài luyện tập",
    fallbackDocument: "Tài liệu đã chọn",
    chat: "Hỏi AI",
    regenerate: "Tạo lại"
  },
  review: {
    title: "Xem lại giải thích",
    yourAnswer: "Đáp án của bạn",
    correctAnswer: "Đáp án đúng",
    explanation: "Giải thích",
    notSelected: "Chưa chọn"
  },
  question: {
    progress: (current, total) => `Câu ${current} / ${total}`,
    completion: (percent) => `Hoàn thành ${percent}%`,
    listTitle: "Trả lời câu hỏi",
    listSubtitle: "Chọn đáp án cho từng câu, sau đó nộp bài để xem kết quả",
    answered: (answered, total) => `Đã trả lời ${answered} / ${total} câu`,
    unansweredHint: "Hãy trả lời tất cả câu hỏi trước khi nộp bài",
    submit: "Nộp bài",
    explanation: "Giải thích",
    noExplanation: "Chưa có giải thích cho câu hỏi này.",
    previous: "Câu trước",
    check: "Kiểm tra đáp án",
    result: "Xem kết quả",
    next: "Câu tiếp theo"
  },
  confirm: {
    title: "Tạo bài trắc nghiệm mới?",
    message: "AI sẽ tạo một bộ câu hỏi mới. Tiến trình hiện tại của bạn sẽ bị xóa.",
    confirm: "Tạo mới",
    cancel: "Giữ bài hiện tại"
  },
  result: {
    summaryLabel: "Tổng kết kết quả",
    score: (score, total) => `Đúng ${score} / ${total} câu`,
    strong: "Bạn nắm tài liệu này rất chắc. Hãy tiếp tục với phần kiến thức nâng cao trong tài liệu.",
    good: "Tiến độ tốt. Hãy xem lại phần giải thích của những câu chưa đúng.",
    needsReview: "Bạn nên ôn lại tài liệu này thêm một lượt, bắt đầu từ các phần giải thích bên dưới.",
    retake: "Làm lại"
  }
};

export const USAGE_QUOTA_TEXTS = {
  unlimited: "Không giới hạn",
  title: "Mức sử dụng và hạn mức",
  subtitle: "Hạn mức hiện tại cho hỏi AI, tạo nội dung và tải tài liệu.",
  plan: "Gói dịch vụ",
  chatMessages: "Tin nhắn hỏi AI",
  aiGenerations: "Lượt tạo nội dung",
  documents: "Tài liệu"
};

export const SETTINGS_WORKSPACE_TEXTS = {
  unknownBrowser: "Trình duyệt không rõ",
  unknownOs: "Không rõ hệ điều hành",
  passwordSaved: "Đã lưu cài đặt",
  preferences: {
    title: "Thiết lập AI",
    subtitle: "Cấu hình cách AI Tutor phản hồi",
    notificationsTitle: "Thông báo",
    emailNotifications: "Thông báo email",
    emailNotificationsDesc: "Cập nhật về tài liệu và tài khoản",
    detailTitle: "Độ chi tiết câu trả lời",
    save: "Lưu cài đặt",
    saving: "Đang lưu...",
    options: [
      { id: "concise", label: "Ngắn gọn", desc: "Súc tích, trọng tâm" },
      { id: "balanced", label: "Cân bằng", desc: "Đủ chi tiết, rõ ràng" },
      { id: "detailed", label: "Chi tiết", desc: "Giải thích sâu, nhiều ví dụ" }
    ]
  },
  sessions: {
    title: "Thiết bị",
    subtitle: "Danh sách thiết bị đang đăng nhập vào tài khoản",
    revokeAll: "Đăng xuất tất cả",
    empty: "Chưa có thiết bị đăng nhập nào được ghi lại",
    unknownIp: "IP không xác định",
    lastSeen: "Lần cuối:",
    revoke: "Đăng xuất",
    revoking: "Đang xử lý..."
  },
  nav: {
    preferences: "Thiết lập AI",
    usage: "Hạn mức & gói",
    sessions: "Thiết bị",
    upgrade: "Thanh toán"
  },
  page: {
    title: "Cài đặt",
    subtitle: "Hồ sơ, bảo mật và hạn mức sử dụng",
    usageTitle: "Hạn mức và gói hiện tại",
    usageSubtitle: "Theo dõi lượt hỏi AI, lượt tạo nội dung và giới hạn tải tài liệu"
  },
  plans: [
    {
      id: "free",
      name: "Miễn phí",
      tagline: "Dùng các tính năng cơ bản",
      priceLabel: "₫0",
      unit: "VND /tháng",
      featured: false,
      features: [
        { icon: "hub", text: "AI cơ bản" },
        { icon: "chat", text: "30 tin nhắn/ngày" },
        { icon: "auto_awesome", text: "10 lượt tạo nội dung AI/ngày" },
        { icon: "upload_file", text: "Tối đa 3 tài liệu" }
      ]
    },
    {
      id: "pro",
      name: "Pro",
      tagline: "Cho lịch học dày và nhiều tài liệu",
      priceLabel: "₫99.000",
      unit: "VND /tháng (bao gồm VAT)",
      featured: true,
      badge: "Phổ biến",
      features: [
        { icon: "hub", text: "AI nâng cao" },
        { icon: "chat", text: "Không giới hạn tin nhắn" },
        { icon: "auto_awesome", text: "Không giới hạn tạo nội dung AI" },
        { icon: "upload_file", text: "Không giới hạn tài liệu" },
        { icon: "psychology", text: "Ưu tiên xử lý AI" }
      ]
    }
  ]
};

export const HELP_WORKSPACE_TEXTS = {
  tabs: [
    { id: "guide", label: "Hướng dẫn", icon: "menu_book" },
    { id: "faq", label: "Hỏi đáp", icon: "help" },
    { id: "contact", label: "Liên hệ", icon: "support_agent" }
  ],
  guide: [
    {
      icon: "upload_file",
      title: "Tải tài liệu",
      body: "Dùng Thư viện tài liệu để quản lý PDF, DOC và DOCX. Giới hạn dung lượng hiện tại là 50MB mỗi tài liệu."
    },
    {
      icon: "hub",
      title: "AI trả lời dựa trên tài liệu như thế nào",
      body: "AI Tutor tìm các đoạn liên quan trong tài liệu bạn chọn, rồi dùng chúng làm căn cứ để trả lời. Mỗi lần học nên dùng một tài liệu rõ ràng."
    },
    {
      icon: "forum",
      title: "Đặt câu hỏi tốt hơn",
      body: "Nêu rõ khái niệm, yêu cầu so sánh, xin ví dụ, hoặc nhờ AI giải thích chỉ dựa trên tài liệu đã chọn."
    },
    {
      icon: "quiz",
      title: "Tạo trắc nghiệm",
      body: "Mục Luyện tập hiện tạo bộ câu hỏi trắc nghiệm từ một tài liệu đã sẵn sàng. Trả lời từng câu, xem giải thích, rồi hỏi tiếp trong Hỏi AI."
    },
    {
      icon: "account_tree",
      title: "Dùng sơ đồ tư duy",
      body: "Sơ đồ tư duy phù hợp để nhìn cấu trúc: chương mục, khái niệm, quan hệ phụ thuộc và lộ trình ôn tập. Dùng phóng to, thu nhỏ và công cụ chỉnh sửa để tinh chỉnh."
    },
    {
      icon: "error",
      title: "Xử lý lỗi phân tích tài liệu",
      body: "Nếu tài liệu thất bại, hãy thử lại trong Thư viện tài liệu. Nếu vẫn kẹt, kiểm tra định dạng, dung lượng rồi gửi hỗ trợ kèm tên tài liệu."
    }
  ],
  faq: [
    ["Vì sao cần chọn tài liệu khi hỏi AI?", "AI Tutor chỉ đọc tài liệu bạn chọn. Câu trả lời vì vậy có căn cứ hơn và không trộn lẫn tài liệu không liên quan."],
    ["Có thể tải slide hoặc PPT không?", "Chưa. Hiện tại hệ thống chỉ hỗ trợ PDF, DOC và DOCX."],
    ["Tài liệu trong menu bên trái đã đi đâu?", "Tài liệu là nội dung học, không phải mục điều hướng. Hãy dùng Thư viện tài liệu hoặc bộ chọn tài liệu trong Hỏi AI, Luyện tập và Sơ đồ tư duy."],
    ["Vì sao tài liệu đang xử lý?", "Hệ thống đang đọc nội dung tài liệu. Thư viện sẽ tự động cập nhật trạng thái xử lý."],
    ["Nên kiểm chứng câu trả lời thế nào?", "Xem các đoạn trích dẫn đi kèm câu trả lời AI và hỏi tiếp khi một nhận định cần làm rõ."]
  ],
  toast: {
    closeAria: "Đóng thông báo",
    success: "Đã gửi yêu cầu hỗ trợ. Chúng tôi sẽ phản hồi qua email."
  },
  validation: {
    subjectRequired: "Vui lòng nhập tiêu đề.",
    messageRequired: "Vui lòng nhập nội dung.",
    messageMinLength: "Nội dung cần ít nhất 20 ký tự."
  },
  header: {
    title: "Trợ giúp",
    subtitle: "Hướng dẫn sử dụng và câu hỏi thường gặp",
    library: "Thư viện tài liệu",
    start: "Bắt đầu học"
  },
  faqSearchPlaceholder: "Tìm trong trợ giúp...",
  contact: {
    title: "Liên hệ hỗ trợ",
    subtitle: "Hãy kèm tên tài liệu, trình duyệt và điều bạn mong đợi hệ thống thực hiện.",
    subject: "Tiêu đề",
    subjectPlaceholder: "Ví dụ: Tài liệu xử lý thất bại",
    message: "Nội dung",
    messagePlaceholder: "Mô tả vấn đề trong vài câu...",
    charCount: (count) => `${count} ký tự`,
    submit: "Gửi yêu cầu hỗ trợ"
  }
};

export const ADMIN_TEXTS = {
  shell: {
    brand: "AI Tutor",
    subtitle: "Quản trị hệ thống",
    roleLabel: "Quản trị viên",
    openMenu: "Mở menu",
    closeMenu: "Đóng menu",
    nav: [
      { to: "/admin", label: "Tổng quan", icon: "dashboard", exact: true },
      { to: "/admin/users", label: "Người dùng", icon: "group" },
      { to: "/admin/documents", label: "Tài liệu", icon: "description" },
      { to: "/admin/plans", label: "Gói dịch vụ", icon: "workspace_premium" },
      { to: "/admin/revenue", label: "Doanh thu", icon: "payments" },
      { to: "/admin/activity", label: "Hoạt động", icon: "monitoring" },
      { to: "/admin/audit", label: "Nhật ký", icon: "shield" },
    ],
    titles: {
      "/admin": "Tổng quan",
      "/admin/users": "Người dùng",
      "/admin/documents": "Tài liệu",
      "/admin/plans": "Gói dịch vụ",
      "/admin/revenue": "Doanh thu",
      "/admin/activity": "Hoạt động",
      "/admin/audit": "Nhật ký",
    },
  },
  login: {
    title: "Quản lý hệ thống AI Tutor",
    subtitle: "Theo dõi hoạt động, quản lý người dùng và tài liệu từ một nơi.",
    email: "Email",
    password: "Mật khẩu",
    submit: "Đăng nhập",
    loading: "Đang đăng nhập...",
    error: "Email hoặc mật khẩu không đúng.",
  },
  dashboard: {
    title: "Tổng quan",
    subtitle: "Thống kê hoạt động hệ thống AI Tutor",
    emptyAttention: "Không có tài liệu cần xử lý",
    metrics: {
      revenueMonth: "Doanh thu tháng",
      activeUsers: "Đang online",
      newUsers: "Người dùng mới",
      failedDocs: "Tài liệu lỗi",
      chatToday: "Chat hôm nay",
      generationToday: "Lượt tạo AI",
    },
    sections: {
      revenue: "Biểu đồ doanh thu",
      featureUsage: "Tính năng sử dụng",
      activeUsers: "Đang online",
      heavyUsers: "Dùng AI nhiều nhất",
      recentSubscriptions: "Nâng cấp gần đây",
      attentionDocs: "Tài liệu cần xử lý",
      alerts: "Cảnh báo hệ thống",
    },
  },
  users: {
    title: "Quản lý người dùng",
    searchPlaceholder: "Tìm theo tên hoặc email...",
    columns: ["Người dùng", "MSSV", "Email", "Gói", "Trạng thái", "Thao tác"],
    actions: {
      detail: "Chi tiết",
      block: "Khóa",
      unblock: "Mở khóa",
      makeAdmin: "Gán quyền Admin",
      makeStudent: "Gán quyền Học sinh",
      assignPlan: "Gán gói dịch vụ",
    },
    detail: {
      title: "Chi tiết người dùng",
      profile: "Hồ sơ",
      quota: "Hạn mức",
      usage: "Sử dụng",
      documents: "Tài liệu",
      sessions: "Phiên hoạt động",
      adminActions: "Thao tác quản trị",
    },
  },
  documents: {
    title: "Quản lý tài liệu",
    searchPlaceholder: "Tìm theo tên tài liệu...",
    owner: "Chủ sở hữu",
    status: "Trạng thái",
    size: "Dung lượng",
    pages: "Số trang",
    skills: "Kỹ năng AI",
    retry: "Thử lại",
    delete: "Xóa",
    confirmDelete: "Xác nhận xóa tài liệu này?",
    skillLabels: {
      summary: "Tóm tắt",
      quiz: "Trắc nghiệm",
      mindmap: "Sơ đồ tư duy",
      studyQuestions: "Câu hỏi ôn tập",
    },
  },
  plans: {
    title: "Quản lý gói dịch vụ",
    subtitle: "Cấu hình các gói dịch vụ và giá cả",
    price: "Giá",
    discountedPrice: "Giá khuyến mãi",
    discount: "Giảm giá (%)",
    chatQuota: "Hạn mức chat/ngày",
    generationQuota: "Hạn mức AI/ngày",
    documentLimit: "Giới hạn tài liệu",
    fileLimit: "Giới hạn file (MB)",
    active: "Kích hoạt",
    popular: "Phổ biến",
    sortOrder: "Thứ tự",
  },
  revenue: {
    title: "Doanh thu",
    subtitle: "Theo dõi doanh thu và giao dịch",
    total: "Tổng doanh thu",
    month: "Tháng",
    year: "Năm",
    chart: "Biểu đồ",
    breakdown: "Chi tiết",
    transactions: "Giao dịch",
    conversion: "Tỷ lệ chuyển đổi",
    monthlyPlan: "Gói tháng",
    annualPlan: "Gói năm",
  },
  activity: {
    title: "Hoạt động người dùng",
    subtitle: "Theo dõi phiên hoạt động gần đây",
    columns: { user: "Người dùng", device: "Thiết bị / IP", lastActive: "Hoạt động gần nhất", usage: "Lượt dùng" },
    windows: [
      { value: 5, label: "5 phút gần đây" },
      { value: 15, label: "15 phút gần đây" },
      { value: 60, label: "1 giờ gần đây" },
      { value: 1440, label: "24 giờ gần đây" },
    ],
  },
  audit: {
    title: "Nhật ký thao tác",
    subtitle: "Lịch sử thao tác của quản trị viên",
    filters: {
      admin: "Tìm quản trị viên...",
      from: "Từ ngày",
      to: "Đến ngày",
    },
    actions: [
      { value: "", label: "Tất cả hành động" },
      { value: "USER_BLOCKED", label: "Khóa người dùng" },
      { value: "USER_UNBLOCKED", label: "Mở khóa người dùng" },
      { value: "USER_ROLE_CHANGED", label: "Thay đổi vai trò" },
      { value: "SUBSCRIPTION_CHANGED", label: "Gán gói dịch vụ" },
      { value: "DOCUMENT_RETRIED", label: "Thử lại tài liệu" },
      { value: "DOCUMENT_DELETED", label: "Xóa tài liệu" },
      { value: "PLAN_UPDATED", label: "Cập nhật gói" },
      { value: "USER_UPDATED", label: "Cập nhật thông tin" },
    ],
    // _dummy: [
      // { value: "", label: "Tất cả hành động" },
      // { value: "block_user", label: "Khóa người dùng" },
      // { value: "unblock_user", label: "Mở khóa" },
      // { value: "update_plan", label: "Cập nhật gói" },
      // { value: "delete_document", label: "Xóa tài liệu" },
      // { value: "retry_document", label: "Thử lại tài liệu" },
    // ],
  },
  common: {
    save: "Lưu",
    actions: "Thao tác",
    emptyTitle: "Không có dữ liệu",
    emptySubtitle: "Chưa có dữ liệu để hiển thị",
    confirmTitle: "Xác nhận",
    confirmCancel: "Hủy",
    confirmOk: "Xác nhận",
    toastDismiss: "Đóng",
    range: (start, end, total) => `${start}–${end} / ${total}`,
    page: (current, total) => `Trang ${current} / ${total}`,
    previous: "Trang trước",
    next: "Trang sau",
    loading: "Đang tải…",
    loadError: "Không thể tải dữ liệu",
    retry: "Thử lại",
  },
};
