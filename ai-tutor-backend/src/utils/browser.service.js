const puppeteer = require('puppeteer-core');

const DEBUG_PORT = 9222;
const BROWSER_URL = `http://127.0.0.1:${DEBUG_PORT}`;

/**
 * Trình dịch vụ tương tác trực tiếp với Chrome qua Debugging Port 9222.
 */
class BrowserService {
  /**
   * Kết nối tới trình duyệt đang mở của lập trình viên
   * @returns {Promise<import('puppeteer-core').Browser>}
   */
  async connect() {
    try {
      const browser = await puppeteer.connect({
        browserURL: BROWSER_URL,
        defaultViewport: null, // Giữ nguyên kích thước màn hình của lập trình viên
      });
      return browser;
    } catch (err) {
      console.error('[BrowserService] Failed to connect to port 9222:', err.message);
      throw new Error(
        'Không thể kết nối tới Google Chrome qua cổng 9222.\n' +
        'Vui lòng chạy file "start-chrome-debug.bat" ở thư mục gốc dự án trước để kích hoạt cổng gỡ lỗi.'
      );
    }
  }

  /**
   * Quét và phân tích chi tiết một trang web đang mở hoặc truy cập mới
   * @param {string} targetUrl - URL cần phân tích (ví dụ: http://localhost:5173)
   * @returns {Promise<{title: string, url: string, logs: string[], screenshot: string, bodyText: string}>}
   */
  async inspectPage(targetUrl) {
    let browser;
    let page;
    const logs = [];

    try {
      browser = await this.connect();
      const pages = await browser.pages();
      
      // Tìm xem có tab nào đang mở chứa URL cần quét không (để tránh mở tab mới liên tục)
      const cleanTarget = targetUrl.toLowerCase().trim();
      page = pages.find(p => p.url().toLowerCase().includes(cleanTarget) || cleanTarget.includes(p.url().toLowerCase()));

      if (!page) {
        // Nếu chưa mở, tiến hành mở tab mới
        page = await browser.newPage();
        
        // Đăng ký lắng nghe console logs trước khi load trang
        page.on('console', msg => {
          const type = msg.type().toUpperCase();
          if (type === 'ERROR' || type === 'WARNING' || type === 'LOG') {
            logs.push(`[Console ${type}] ${msg.text()}`);
          }
        });

        await page.goto(targetUrl, { waitUntil: 'load', timeout: 15000 });
      } else {
        // Nếu đã mở, mang tab đó lên phía trước (Active Tab)
        await page.bringToFront();
        
        // Đăng ký lắng nghe console logs tiếp diễn
        page.on('console', msg => {
          const type = msg.type().toUpperCase();
          if (type === 'ERROR' || type === 'WARNING') {
            logs.push(`[Console ${type}] ${msg.text()}`);
          }
        });

        // Đợi 1 giây để thu thập bất kỳ log nào mới phát sinh
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 1. Trích xuất thông tin chung
      const title = await page.title();
      const currentUrl = page.url();

      // 2. Lấy nội dung text trong body (giới hạn để tránh quá tải token)
      const rawText = await page.evaluate(() => document.body.innerText);
      const bodyText = (rawText || '').slice(0, 8000);

      // 3. Chụp ảnh màn hình (chất lượng cao, định dạng WebP siêu nhẹ)
      const screenshot = await page.screenshot({
        encoding: 'base64',
        type: 'webp',
        quality: 75
      });

      return {
        title,
        url: currentUrl,
        logs: logs.slice(0, 30), // Lấy tối đa 30 logs mới nhất
        bodyText,
        screenshot: `data:image/webp;base64,${screenshot}`
      };
    } catch (err) {
      console.error('[BrowserService] inspectPage error:', err.message);
      throw err;
    } finally {
      // Ngắt kết nối Puppeteer nhưng KHÔNG đóng trình duyệt Chrome của người dùng!
      if (browser) {
        try {
          await browser.disconnect();
        } catch (e) {
          // ignore disconnect errors
        }
      }
    }
  }
}

const browserService = new BrowserService();
module.exports = browserService;
