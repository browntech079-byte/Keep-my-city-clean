const nodemailer = require("nodemailer");

// Sends mail through the Gmail account configured via EMAIL_USER /
// EMAIL_PASS (a Gmail App Password, not the normal account password —
// see the setup guide for how to generate one).
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendOtpEmail(toEmail, otp) {

    await transporter.sendMail({
        from: `"CityCare" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: "Your CityCare verification code",
        text: `Your CityCare verification code is ${otp}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 420px; margin: 0 auto; padding: 24px;">
                <h2 style="margin: 0 0 12px; color: #17171B;">CityCare</h2>
                <p style="color: #44444E; font-size: 15px;">
                    Use the code below to verify your email and finish creating your CityCare account.
                </p>
                <div style="margin: 20px 0; padding: 16px; background: #F5F5F6; border-radius: 12px; text-align: center;">
                    <span style="font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #17171B;">${otp}</span>
                </div>
                <p style="color: #777781; font-size: 13px;">
                    This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
                </p>
            </div>
        `
    });
}

module.exports = { sendOtpEmail };