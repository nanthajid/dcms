import axios from 'axios';

/**
 * ตั้งค่า axios ส่วนกลาง — import ครั้งเดียวที่ main.tsx
 *
 * ตอนนี้ api/admin/ ตรวจ session ฝั่งเซิร์ฟเวอร์แล้ว ถ้า session หมดอายุหรือถูกล้าง
 * ทุก endpoint จะตอบ 401 กลับมา ถ้าไม่ดักไว้ หน้าจอจะขึ้น error รัว ๆ
 * ทั้งที่สาเหตุจริงคือหลุดจากระบบไปแล้ว
 */

// same-origin อยู่แล้วจึงส่ง cookie ให้เองก็จริง
// แต่ตั้งไว้ชัดเจนเผื่อวันหลังย้าย API ไปคนละโดเมน
axios.defaults.withCredentials = true;

let redirecting = false;

axios.interceptors.response.use(
  response => response,
  error => {
    const status = error?.response?.status;
    const url: string = error?.config?.url || '';

    // ไม่ดักหน้า login เอง ไม่งั้นกรอกรหัสผิดจะกลายเป็นเด้งวนซ้ำ
    const isAuthEndpoint = url.includes('login.php') || url.includes('logout.php');

    if (status === 401 && !isAuthEndpoint && !redirecting) {
      // กันเด้งซ้ำเมื่อหลาย request ล้มพร้อมกันตอนโหลดหน้า
      redirecting = true;

      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');

      // basename ของ router คือ /dcms จึงต้องใส่เอง เพราะออกนอก react-router
      window.location.href = '/dcms/admin/login';
    }

    return Promise.reject(error);
  }
);

export default axios;
