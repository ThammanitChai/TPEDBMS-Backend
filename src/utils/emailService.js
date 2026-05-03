const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  pool: true,
  maxConnections: 3,
  socketTimeout: 10000,
  greetingTimeout: 10000,
  connectionTimeout: 10000,
});

const sendOtpEmail = async (to, otp, type) => {
  const isReset = type === 'reset';
  const subject = isReset
    ? 'รีเซ็ตรหัสผ่าน — ThaiPinnacle CRM'
    : 'ยืนยันการลงทะเบียน — ThaiPinnacle CRM';
  const action = isReset ? 'รีเซ็ตรหัสผ่าน' : 'ยืนยันการลงทะเบียน';

  await transporter.sendMail({
    from: `"ThaiPinnacle CRM" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: linear-gradient(135deg, #dc2626, #b91c1c); padding: 28px 32px;">
          <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 800;">ThaiPinnacle CRM</h1>
          <p style="margin: 4px 0 0; color: rgba(255,255,255,0.8); font-size: 13px;">Engineering Solutions</p>
        </div>
        <div style="padding: 32px;">
          <p style="margin: 0 0 8px; font-size: 15px; color: #374151;">รหัส OTP สำหรับ<strong>${action}</strong>:</p>
          <div style="font-size: 40px; font-weight: 800; letter-spacing: 12px; color: #dc2626; padding: 20px; background: #fef2f2; border-radius: 10px; text-align: center; margin: 16px 0;">${otp}</div>
          <p style="margin: 0; font-size: 13px; color: #9ca3af;">รหัสนี้จะหมดอายุใน <strong>10 นาที</strong> — อย่าแชร์รหัสนี้กับผู้อื่น</p>
        </div>
      </div>
    `,
  });
};

module.exports = { sendOtpEmail };
