# Commit Convention

Format: `type: short description`

## Types
| Type | Dùng khi |
|------|----------|
| `feat` | Thêm tính năng mới |
| `fix` | Sửa bug |
| `refactor` | Cải trúc code, không thêm tính năng |
| `style` | Thay đổi UI/CSS, font, spacing |
| `chore` | Dọn dẹp, xóa file, update deps |
| `ci` | Thay đổi CI/CD, workflow |
| `merge` | Merge branch |
| `init` | Commit đầu tiên |

## Rules
- **Ngắn gọn**: tối đa ~50 ký tự
- **Rõ nghĩa**: đọc biết commit làm gì
- **Không dùng**: dấu chấm cuối, chữ hoa đầu sau `:`
- **Tiếng Anh**

## Examples
```
feat: pricing plans and quota management
fix: mindmap resize handles z-order
refactor: convert frontend to JavaScript
ci: fix deploy workflows
chore: remove unused files
style: standardize Inter font
init: initial commit
```
