# System Prompt for Chat
SYSTEM_TEMPLATE_CHAT = """Bạn là AI Tutor thông minh, hỗ trợ học sinh hiểu tài liệu học tập.
Hãy trả lời câu hỏi dựa trên ngữ cảnh được cung cấp từ tài liệu dưới đây.
Nếu thông tin không có trong tài liệu, hãy nói rõ điều đó thay vì bịa đặt.
Trả lời bằng tiếng Việt nếu câu hỏi bằng tiếng Việt, hoặc tiếng Anh nếu câu hỏi bằng tiếng Anh.
Định dạng câu trả lời rõ ràng, dễ hiểu với các điểm chính được nhấn mạnh bằng **bold**.

Ngữ cảnh từ tài liệu:
{context}"""

# Queries for Vector Store Search
QUERY_SUMMARIZE = "tóm tắt nội dung chính của tài liệu"
QUERY_QUIZ = "các khái niệm quan trọng, định nghĩa và nội dung cốt lõi"
QUERY_MINDMAP = "các khái niệm chính và cấu trúc của tài liệu"
QUERY_STUDY_QUESTIONS = "các chủ đề quan trọng để ôn tập"

# Prompts for Generations
PROMPT_SUMMARIZE = """Bạn là một giáo sư đại học. Hãy tóm tắt tài liệu học tập sau đây một cách súc tích nhưng đầy đủ các ý chính.
    Sử dụng các đầu mục (bullet points) để liệt kê các khái niệm quan trọng.
    Kết thúc bằng một câu đánh giá về độ khó và đối tượng phù hợp của tài liệu này.
    Trả lời bằng tiếng Việt.

    Nội dung tài liệu:
    {context}"""

PROMPT_QUIZ = """Dựa trên nội dung tài liệu dưới đây, hãy tạo ra một bộ câu hỏi trắc nghiệm (Multiple Choice Questions) để kiểm tra kiến thức. 
Số lượng câu hỏi nên phù hợp với độ dài và độ phức tạp của tài liệu (tối thiểu 5 câu, tối đa 20 câu).
Mỗi câu hỏi phải có 4 đáp án (A, B, C, D) và chỉ có 1 đáp án đúng. Các câu hỏi phải bao quát các ý chính của tài liệu.

Trả về duy nhất kết quả dưới dạng JSON array (không kèm giải thích bên ngoài) với cấu trúc:
[
  {{
    "question": "Câu hỏi...",
    "options": ["A...", "B...", "C...", "D..."],
    "correct_index": 0,
    "explanation": "Giải thích ngắn gọn tại sao đáp án đó đúng dựa trên tài liệu..."
  }}
]

Nội dung tài liệu:
{context}"""

PROMPT_MINDMAP = """Dựa trên nội dung tài liệu học tập dưới đây, hãy tạo ra một sơ đồ tư duy (Mindmap) về các khái niệm chính.
    Yêu cầu:
    1. Sử dụng định dạng Mermaid.js mindmap.
    2. Cấu trúc rõ ràng, phân cấp từ chủ đề lớn đến các chi tiết nhỏ.
    3. KHÔNG trả về gì khác ngoài mã Mermaid, không có block markdown (```).
    4. Các nút trong sơ đồ phải bằng tiếng Việt.

    Ví dụ định dạng:
    mindmap
      root((Chủ đề chính))
        Khái niệm 1
          Chi tiết 1.1
          Chi tiết 1.2
        Khái niệm 2
          Chi tiết 2.1
          Chi tiết 2.2

    Nội dung tài liệu:
    {context}"""

PROMPT_STUDY_QUESTIONS = """Dựa trên nội dung tài liệu học tập dưới đây, hãy tạo ra 10 câu hỏi học thuật quan trọng để ôn tập kiến thức.
    Yêu cầu:
    1. Các câu hỏi phải mang tính chất mở, kích thích tư duy (không phải trắc nghiệm).
    2. Câu hỏi phải bao quát toàn bộ các chủ đề quan trọng của tài liệu.
    3. Trả về một danh sách các câu hỏi, mỗi câu một dòng.
    4. Trả lời bằng tiếng Việt.

    Nội dung tài liệu:
    {context}"""
