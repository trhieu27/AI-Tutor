"""
Tập trung toàn bộ chuỗi text hiển thị của backend vào một nơi.
Tương tự pattern texts.ts ở frontend.
"""

# ── Document Processing Notifications ────────────────────────────────────────

class DocNotif:
    READY_TITLE   = "Xử lý thành công"
    READY_MSG     = "Tài liệu \u201c{name}\u201d đã sẵn sàng để chat với AI."

    FAILED_TITLE  = "Xử lý thất bại"
    FAILED_MSG    = "Tài liệu \u201c{name}\u201d gặp lỗi. Vui lòng thử lại."


# ── Quota / HTTP Error Messages ───────────────────────────────────────────────

class QuotaMsg:
    DOC_LIMIT     = "Tài khoản miễn phí chỉ được tải lên tối đa {limit} tài liệu. Nâng cấp Pro để không giới hạn."
    CHAT_LIMIT    = "Bạn đã dùng hết {limit} tin nhắn miễn phí hôm nay. Nâng cấp Pro hoặc quay lại vào ngày mai."
    AI_LIMIT      = "Bạn đã dùng hết {limit} lần tạo nội dung AI miễn phí hôm nay. Nâng cấp Pro hoặc quay lại vào ngày mai."
    CHAR_LIMIT    = "Tài khoản miễn phí giới hạn câu hỏi tối đa {limit} ký tự ({count} đã nhập). Nâng cấp Pro để hỏi không giới hạn."


# ── Generic Error Messages ────────────────────────────────────────────────────

class ErrMsg:
    DOC_NOT_FOUND     = "Tài liệu không tồn tại hoặc chưa được xử lý"
    DOC_NOT_READY     = "Tài liệu chưa sẵn sàng"
    SESSION_NOT_FOUND = "Phiên chat không tồn tại"
    USER_NOT_FOUND    = "Người dùng không tồn tại"
    FILE_NOT_FOUND    = "Không tìm thấy file tài liệu trên server."
    AI_OVERLOAD       = "Bộ não AI hiện đang quá tải lượt dùng. Vui lòng thử lại sau giây lát nhé."
    INVALID_QUESTION  = "Câu hỏi chứa nội dung không hợp lệ. Vui lòng đặt câu hỏi khác."
    INVALID_FILE_TYPE = "Định dạng file không hỗ trợ. Chỉ chấp nhận: {types}"
    FILE_TOO_LARGE    = "File quá lớn. Tối đa {max_mb}MB."
    SERVER_ERROR      = "Hệ thống đang bận hoặc gặp lỗi xử lý. Vui lòng thử lại sau nhé."
