import nodemailer from 'nodemailer';

export const sendOtpEmail = async(toEmail, otp) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false, // ✅ Add this
        },
    });


    const mailOptions = {
        from: `"JustMyPictures" <${process.env.GMAIL_USER}>`,
        to: toEmail,
        subject: "Your OTP for JustMyPictures Signup",
        text: `Your OTP is: ${otp}. It will expire in 5 minutes.`,
    };

    await transporter.sendMail(mailOptions);
};