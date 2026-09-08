from typing import Optional
import sendgrid
from sendgrid.helpers.mail import Mail, Email, To, Content, DynamicTemplateData
from ..core.config import get_settings
import logging
from random import randint

settings = get_settings()
logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
        self.from_email = Email(settings.FROM_EMAIL, name=settings.FROM_NAME)

    async def send_email(self, to_email: str, subject: str, content: str) -> bool:
        try:
            to_email = To(to_email)
            content = Content("text/html", content)
            mail = Mail(self.from_email, to_email, subject, content)
            
            response = self.sg.client.mail.send.post(request_body=mail.get())
            logger.info(f"Email sent to {to_email}. Status: {response.status_code}")
            return response.status_code in [200, 201, 202]
        except Exception as e:
            logger.error(f"Error sending email: {str(e)}")
            return False

    def generate_verification_code(self) -> str:
        """Generate a 6-digit verification code"""
        return str(randint(100000, 999999))

    async def send_verification_code(self, email: str, code: str) -> bool:
        """Send verification code email"""
        subject = "Flex Living Email Verification"
        content = f"""
        <html>
            <body>
                <h2>Welcome to Flex Living!</h2>
                <p>Your verification code is: <strong>{code}</strong></p>
                <p>This code will expire in 15 minutes.</p>
                <p>If you didn't request this code, please ignore this email.</p>
            </body>
        </html>
        """
        return await self.send_email(email, subject, content)

    async def send_password_reset(self, email: str, reset_link: str) -> bool:
        """Send password reset email"""
        subject = "Flex Living Password Reset"
        content = f"""
        <html>
            <body>
                <h2>Password Reset Request</h2>
                <p>Click the link below to reset your password:</p>
                <p><a href="{reset_link}">Reset Password</a></p>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request a password reset, please ignore this email.</p>
            </body>
        </html>
        """
        return await self.send_email(email, subject, content)

    async def send_welcome_email(self, email: str) -> bool:
        """Send welcome email after successful verification"""
        subject = "Welcome to Flex Living!"
        content = f"""
        <html>
            <body>
                <h2>Welcome to Flex Living!</h2>
                <p>Thank you for verifying your email address.</p>
                <p>You can now access all features of our platform.</p>
                <p>If you have any questions, feel free to contact our support team.</p>
            </body>
        </html>
        """
        return await self.send_email(email, subject, content)

# Create email service instance
email_service = EmailService()