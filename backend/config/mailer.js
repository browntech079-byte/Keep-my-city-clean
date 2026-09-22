// Sends mail through Brevo's HTTPS API (https://api.brevo.com) —
// NOT SMTP. Render's free tier blocks outbound SMTP ports (25,
// 465, 587), so nodemailer/Gmail-SMTP silently hangs and times
// out there. Brevo's API runs over plain HTTPS (port 443), which
// is never blocked.
//
// Needs two env vars:
//   BREVO_API_KEY      - from Brevo dashboard > SMTP & API > API Keys
//   BREVO_SENDER_EMAIL  - the email address you verified as a
//                         sender in Brevo (can be your own Gmail)

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

async function sendOtpEmail(toEmail, otp) {

    const response = await fetch(BREVO_API_URL, {
        method: "POST",
        headers: {
            "accept": "application/json",
            "content-type": "application/json",
            "api-key": process.env.BREVO_API_KEY
        },
        body: JSON.stringify({
            sender: {
                name: "CityCare",
                email: process.env.BREVO_SENDER_EMAIL
            },
            to: [{ email: toEmail }],
            subject: "Your CityCare verification code",
            htmlContent: `
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
        })
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Brevo send failed (${response.status}): ${errorBody}`);
    }
}

module.exports = { sendOtpEmail };