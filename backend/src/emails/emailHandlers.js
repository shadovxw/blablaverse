import { resendClient } from "../lib/resend.js"


export const sendWelcomeEmail = async (email, name, clientURL) => {
  const { data, error } = await resendClient.emails.send({
    from: `${sender.name} <${sender.email}>`,
    to: email,
    subject: "Welcome to BlablaVerse 👋",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Welcome, ${name}! 🎉</h2>

        <p>
          We’re excited to have you on board.
        </p>

        <p>
          Click the button below to get started:
        </p>

        <a
          href="${clientURL}"
          style="
            display: inline-block;
            padding: 10px 16px;
            background-color: #4f46e5;
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
          "
        >
          Go to BlablaVerse
        </a>

        <p style="margin-top: 24px;">
          If the button doesn’t work, copy and paste this link into your browser:
        </p>

        <p>
          <a href="${clientURL}">${clientURL}</a>
        </p>

        <p style="margin-top: 24px;">
          Cheers,<br />
          <strong>The BlablaVerse Team</strong>
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("Error sending welcome email:", error);
  }

  res.status(200).json({ data });
};
