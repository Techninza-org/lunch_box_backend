// config/nodemailer.js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER || "indiaglobal0@gmail.com",
    pass: process.env.GMAIL_PASS || "qlaw luhs lwjm jowb",
  },
});

const sendMail = async (to, subject, message, isHtml = false) => {
  try {
    const mailOptions = {
      from: `"Rootmit team" <${process.env.GMAIL_USER || ""}>`,
      to,
      subject,
      text: isHtml ? undefined : message,
      html: isHtml ? message : undefined,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}: ${info.response}`);
    return { success: true, message: "Email sent successfully." };
  } catch (error) {
    console.error(`❌ Error sending email to ${to}:`, error);
    return { success: false, message: "Email sending failed.", error };
  }
};

export default sendMail;